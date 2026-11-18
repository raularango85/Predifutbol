package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"predifutbol/backend/internal/delivery/http/dto"
	"predifutbol/backend/internal/usecase"
)

type TikTokHandler struct{}

func NewTikTokHandler() *TikTokHandler {
	return &TikTokHandler{}
}

func (h *TikTokHandler) Generate(c *gin.Context) {
	var req dto.GenerateTikTokRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.GenerateTikTokResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	pred := req.ToDomain()
	res := usecase.GenerateTikTokContent(pred)

	c.JSON(http.StatusOK, dto.GenerateTikTokResponse{
		Success:  true,
		Caption:  res.Caption,
		Hashtags: res.Hashtags,
		FullText: res.FullText,
	})
}
