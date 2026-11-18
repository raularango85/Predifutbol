package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"predifutbol/backend/internal/delivery/http/dto"
	"predifutbol/backend/internal/domain"
	"predifutbol/backend/internal/usecase"
)

type FixtureHandler struct {
	fixtureUC *usecase.FixtureUsecase
}

func NewFixtureHandler(fixtureUC *usecase.FixtureUsecase) *FixtureHandler {
	return &FixtureHandler{fixtureUC: fixtureUC}
}

func (h *FixtureHandler) GetFixtures(c *gin.Context) {
	q := c.DefaultQuery("q", "")
	date := c.DefaultQuery("date", "")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
	upcomingOnly := c.DefaultQuery("upcomingOnly", "true") != "false" && c.DefaultQuery("upcomingOnly", "true") != "0"

	fixtures, err := h.fixtureUC.Search(c.Request.Context(), domain.FixtureFilter{
		Query:        q,
		Date:         date,
		UpcomingOnly: upcomingOnly,
		Limit:        limit,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"results": fixtures})
}

func (h *FixtureHandler) Sync(c *gin.Context) {
	var req dto.SyncFixtureRequest
	_ = c.ShouldBindJSON(&req)

	res, err := h.fixtureUC.SyncByDate(c.Request.Context(), req.Date, req.Timezone)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.SyncFixtureResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, dto.SyncFixtureResponse{
		Success:  true,
		Fetched:  res.Fetched,
		Saved:    res.Saved,
		Date:     res.Date,
		Timezone: res.Timezone,
	})
}
