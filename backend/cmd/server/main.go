package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	deliveryHttp "predifutbol/backend/internal/delivery/http"
	"predifutbol/backend/internal/domain"
	"predifutbol/backend/internal/repository"
	"predifutbol/backend/internal/usecase"
	"predifutbol/backend/pkg/audio"
	"predifutbol/backend/pkg/media"
)

func main() {
	// Structured logger setup
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// Load .env from root if available
	_ = godotenv.Load("../../.env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	port := 3001
	if p := os.Getenv("PORT"); p != "" {
		if val, err := strconv.Atoi(p); err == nil {
			port = val
		}
	}

	rootDir, err := os.Getwd()
	if err != nil {
		logger.Error("failed to get working directory", slog.String("error", err.Error()))
		os.Exit(1)
	}

	// Resolve absolute paths
	baseDir := rootDir
	if filepath.Base(baseDir) == "backend" {
		baseDir = filepath.Dir(baseDir)
	}
	seedCachePath := filepath.Join(baseDir, "db", "yii2-seed-cache.json")
	localStorePath := filepath.Join(baseDir, "db", "local-store.json")
	localesPath := filepath.Join(baseDir, "locales")
	publicDir := filepath.Join(baseDir, "public")
	imagesDir := filepath.Join(baseDir, "images")
	exportsDir := filepath.Join(baseDir, "exports")

	// Ensure exports directory exists
	_ = os.MkdirAll(exportsDir, 0755)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 1. Initialize Seed Cache Store (Teams, Leagues, Types)
	logger.Info("loading seed cache store", slog.String("path", seedCachePath))
	seedStore, err := repository.NewSeedCacheStore(seedCachePath)
	if err != nil {
		logger.Error("failed to load seed cache", slog.String("error", err.Error()))
		os.Exit(1)
	}
	teamRepo := repository.NewSeedCacheTeamRepo(seedStore)
	leagueRepo := repository.NewSeedCacheLeagueRepo(seedStore)
	typeRepo := repository.NewSeedCacheTypePredictionRepo(seedStore)

	// 2. Initialize Prediction & Fixture Repositories
	localStore, err := repository.NewLocalStore(localStorePath)
	if err != nil {
		logger.Error("failed to load local store", slog.String("error", err.Error()))
		os.Exit(1)
	}
	localPredRepo := repository.NewLocalStorePredictionRepo(localStore)
	localFixtureRepo := repository.NewLocalStoreFixtureRepo(localStore)

	var activePredRepo domain.PredictionRepository = localPredRepo
	var activeFixtureRepo domain.FixtureRepository = localFixtureRepo
	dbMode := "Local Store (JSON)"

	// Optional PostgreSQL connection
	pgHost := os.Getenv("PGHOST")
	if pgHost != "" {
		pgPort := os.Getenv("PGPORT")
		if pgPort == "" {
			pgPort = "5432"
		}
		pgUser := os.Getenv("PGUSER")
		pgPassword := os.Getenv("PGPASSWORD")
		pgDatabase := os.Getenv("PGDATABASE")
		if pgDatabase == "" {
			pgDatabase = "predifutbol"
		}

		connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
			pgUser, pgPassword, pgHost, pgPort, pgDatabase)

		pgCtx, pgCancel := context.WithTimeout(ctx, 3*time.Second)
		pool, err := pgxpool.New(pgCtx, connStr)
		pgCancel()

		if err == nil && pool.Ping(ctx) == nil {
			logger.Info("connected to PostgreSQL", slog.String("host", pgHost), slog.String("db", pgDatabase))
			activePredRepo = repository.NewPostgresRepository(pool)
			activeFixtureRepo = repository.NewPostgresFixtureRepo(pool)
			dbMode = "PostgreSQL"
		} else {
			logger.Warn("PostgreSQL unavailable, falling back to Local JSON Store")
		}
	}

	// 3. Initialize Usecases
	rapidAPIKey := os.Getenv("RAPIDAPI_KEY")
	rapidAPIHost := os.Getenv("RAPIDAPI_HOST")
	apiBaseURL := os.Getenv("API_FOOTBALL_URL")

	predictionUC := usecase.NewPredictionUsecase(activePredRepo, activeFixtureRepo, rapidAPIKey, rapidAPIHost, apiBaseURL)
	fixtureUC := usecase.NewFixtureUsecase(activeFixtureRepo, rapidAPIKey, rapidAPIHost, apiBaseURL)

	// 4. Initialize Media & Export Services
	ffmpegPath := os.Getenv("FFMPEG_PATH")
	if ffmpegPath == "" {
		candidate := filepath.Join(baseDir, "node_modules", "ffmpeg-static", "ffmpeg.exe")
		if _, err := os.Stat(candidate); err == nil {
			ffmpegPath = candidate
		}
	}
	publicAudioDir := filepath.Join(publicDir, "audio")
	audioSvc := audio.NewAudioService(ffmpegPath, publicAudioDir)
	mediaRenderer := media.NewMediaRenderer(ffmpegPath, exportsDir, audioSvc, baseDir)
	exportUC := usecase.NewExportUsecase(mediaRenderer)

	// 5. Initialize Handlers & Router
	predHandler := deliveryHttp.NewPredictionHandler(predictionUC)
	seedHandler := deliveryHttp.NewSeedHandler(teamRepo, leagueRepo, typeRepo, localesPath, dbMode)
	fixtureHandler := deliveryHttp.NewFixtureHandler(fixtureUC)
	tiktokHandler := deliveryHttp.NewTikTokHandler()
	exportHandler := deliveryHttp.NewExportHandler(exportUC, port)

	router := deliveryHttp.SetupRouter(deliveryHttp.RouterConfig{
		PredictionHandler: predHandler,
		SeedHandler:       seedHandler,
		FixtureHandler:    fixtureHandler,
		TikTokHandler:     tiktokHandler,
		ExportHandler:     exportHandler,
		PublicDir:         publicDir,
		ImagesDir:         imagesDir,
		ExportsDir:        exportsDir,
		FrontendDistDir:   filepath.Join(baseDir, "frontend", "dist"),
	}, logger)

	// 5. HTTP Server with Graceful Shutdown
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		logger.Info(fmt.Sprintf("⚡ PrediFutbol Go Engine listening on http://localhost:%d", port))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server listen error", slog.String("error", err.Error()))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server gracefully...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("server forced to shutdown", slog.String("error", err.Error()))
	}
	logger.Info("server exited cleanly")
}
