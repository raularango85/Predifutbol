package http

import (
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type RouterConfig struct {
	PredictionHandler *PredictionHandler
	SeedHandler       *SeedHandler
	FixtureHandler    *FixtureHandler
	TikTokHandler     *TikTokHandler
	ExportHandler     *ExportHandler
	PublicDir         string
	ImagesDir         string
	ExportsDir        string
	FrontendDistDir   string
}

func SetupRouter(cfg RouterConfig, logger *slog.Logger) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()

	// Logger middleware using log/slog
	r.Use(func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		logger.Info("http request",
			slog.Int("status", status),
			slog.String("method", c.Request.Method),
			slog.String("path", path),
			slog.String("query", raw),
			slog.String("ip", c.ClientIP()),
			slog.Duration("latency", latency),
		)
	})

	r.Use(gin.Recovery())

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// Static asset delivery
	if cfg.PublicDir != "" {
		r.Static("/public", cfg.PublicDir)
	}
	if cfg.ImagesDir != "" {
		r.Static("/images", cfg.ImagesDir)
	}
	if cfg.ExportsDir != "" {
		r.Static("/exports", cfg.ExportsDir)
	}

	api := r.Group("/api")
	{
		// Status & localization
		api.GET("/status", cfg.SeedHandler.GetStatus)
		api.GET("/localize/:lang", cfg.SeedHandler.GetLocalize)

		// Seeds (Teams, Leagues, Types)
		api.GET("/teams", cfg.SeedHandler.GetTeams)
		api.GET("/leagues", cfg.SeedHandler.GetLeagues)
		api.GET("/type-predictions", cfg.SeedHandler.GetTypePredictions)

		// Fixtures
		api.GET("/fixtures", cfg.FixtureHandler.GetFixtures)
		api.POST("/fixtures/sync", cfg.FixtureHandler.Sync)

		// Predictions CRUD & Settlement
		api.GET("/predictions", cfg.PredictionHandler.List)
		api.POST("/predictions", cfg.PredictionHandler.Save)
		api.GET("/predictions/:id", cfg.PredictionHandler.GetByID)
		api.DELETE("/predictions/:id", cfg.PredictionHandler.Delete)
		api.POST("/predictions/:id/settle", cfg.PredictionHandler.Settle)
		api.POST("/predictions/check-all", cfg.PredictionHandler.CheckAll)

		// TikTok Generator
		api.POST("/tiktok/generate", cfg.TikTokHandler.Generate)

		// Exports (PNG snapshot & deterministic 9:16 video)
		if cfg.ExportHandler != nil {
			api.POST("/export", cfg.ExportHandler.StartExport)
			api.GET("/export/jobs/:id", cfg.ExportHandler.GetJob)
		}
	}

	// Serve Frontend SPA if built
	if cfg.FrontendDistDir != "" {
		if stat, err := os.Stat(cfg.FrontendDistDir); err == nil && stat.IsDir() {
			r.Static("/assets", filepath.Join(cfg.FrontendDistDir, "assets"))
			r.NoRoute(func(c *gin.Context) {
				if !strings.HasPrefix(c.Request.URL.Path, "/api") {
					c.File(filepath.Join(cfg.FrontendDistDir, "index.html"))
				}
			})
		}
	}

	return r
}
