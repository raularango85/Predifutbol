package http

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"predifutbol/backend/internal/delivery/http/dto"
	"predifutbol/backend/internal/domain"
)

type SeedHandler struct {
	teamRepo    domain.TeamRepository
	leagueRepo  domain.LeagueRepository
	typeRepo    domain.TypePredictionRepository
	localesPath string
	dbMode      string
}

func NewSeedHandler(
	teamRepo domain.TeamRepository,
	leagueRepo domain.LeagueRepository,
	typeRepo domain.TypePredictionRepository,
	localesPath string,
	dbMode string,
) *SeedHandler {
	return &SeedHandler{
		teamRepo:    teamRepo,
		leagueRepo:  leagueRepo,
		typeRepo:    typeRepo,
		localesPath: localesPath,
		dbMode:      dbMode,
	}
}

func (h *SeedHandler) GetTeams(c *gin.Context) {
	q := c.DefaultQuery("q", "")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "25"))

	teams, err := h.teamRepo.Search(c.Request.Context(), q, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"results": teams})
}

func (h *SeedHandler) GetLeagues(c *gin.Context) {
	q := c.DefaultQuery("q", "")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))

	leagues, err := h.leagueRepo.Search(c.Request.Context(), q, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"results": leagues})
}

func (h *SeedHandler) GetTypePredictions(c *gin.Context) {
	types, err := h.typeRepo.FindAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"results": types})
}

func (h *SeedHandler) GetLocalize(c *gin.Context) {
	lang := c.Param("lang")
	if lang != "es" {
		lang = "en"
	}

	filePath := filepath.Join(h.localesPath, lang+".json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "locale dictionary not found"})
		return
	}

	var dict map[string]any
	if err := json.Unmarshal(data, &dict); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid locale format"})
		return
	}

	c.JSON(http.StatusOK, dict)
}

func (h *SeedHandler) GetStatus(c *gin.Context) {
	c.JSON(http.StatusOK, dto.EngineStatusResponse{
		Status:    "online",
		Engine:    "PrediFutbol Golang Engine v3",
		Version:   "3.0.0",
		Timestamp: time.Now(),
		DBMode:    h.dbMode,
	})
}
