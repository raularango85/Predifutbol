package http

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"predifutbol/backend/internal/delivery/http/dto"
	"predifutbol/backend/internal/domain"
	"predifutbol/backend/internal/usecase"
)

type ExportHandler struct {
	exportUC *usecase.ExportUsecase
	port     int
}

func NewExportHandler(exportUC *usecase.ExportUsecase, port int) *ExportHandler {
	return &ExportHandler{
		exportUC: exportUC,
		port:     port,
	}
}

func (h *ExportHandler) StartExport(c *gin.Context) {
	var req dto.StartExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.StartExportResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	format := domain.ExportFormat(req.Format)
	if format != domain.ExportFormatVideo && format != domain.ExportFormatPNG {
		format = domain.ExportFormatPNG
	}

	langs := req.Langs
	if len(langs) == 0 {
		langs = []string{"es"}
	}

	pred := req.CardData.ToDomain()
	job, err := h.exportUC.StartJob(pred, format, langs, h.port)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.StartExportResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, dto.StartExportResponse{
		Success: true,
		JobID:   job.ID,
	})
}

func (h *ExportHandler) GetJob(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "missing job ID"})
		return
	}

	job, err := h.exportUC.GetJob(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "job not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"job":     job,
	})
}
