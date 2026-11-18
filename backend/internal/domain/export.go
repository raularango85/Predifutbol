package domain

import (
	"context"
	"time"
)

type ExportFormat string

const (
	ExportFormatPNG   ExportFormat = "png"
	ExportFormatVideo ExportFormat = "video"
)

type ExportJobStatus string

const (
	ExportStatusQueued    ExportJobStatus = "queued"
	ExportStatusRunning   ExportJobStatus = "running"
	ExportStatusDone      ExportJobStatus = "done"
	ExportStatusError     ExportJobStatus = "error"
)

type ExportFile struct {
	Lang     string `json:"lang"`
	Format   string `json:"format"`
	FileName string `json:"file_name"`
	URL      string `json:"url"`
}

type ExportJob struct {
	ID          string          `json:"id"`
	Format      ExportFormat    `json:"format"`
	Status      ExportJobStatus `json:"status"`
	Percent     float64         `json:"percent"`
	Stage       string          `json:"stage"`
	Frame       int             `json:"frame"`
	TotalFrames int             `json:"total_frames"`
	ETASec      *int            `json:"eta_sec,omitempty"`
	ElapsedSec  int             `json:"elapsed_sec"`
	Files       []ExportFile    `json:"files"`
	Error       string          `json:"error,omitempty"`
	StartedAt   time.Time       `json:"-"`
}

type ExportRepository interface {
	Save(ctx context.Context, job *ExportJob) error
	FindByID(ctx context.Context, id string) (*ExportJob, error)
	Delete(ctx context.Context, id string) error
}
