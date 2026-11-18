package dto

type StartExportRequest struct {
	CardData SavePredictionRequest `json:"cardData" binding:"required"`
	Format   string                `json:"format"` // "png" or "video"
	Langs    []string              `json:"langs"`  // ["es"], ["en"], ["es", "en"]
}

type StartExportResponse struct {
	Success bool   `json:"success"`
	JobID   string `json:"jobId,omitempty"`
	Error   string `json:"error,omitempty"`
}

type ExportJobResponse struct {
	Success bool `json:"success"`
	Job     any  `json:"job,omitempty"`
	Error   string `json:"error,omitempty"`
}
