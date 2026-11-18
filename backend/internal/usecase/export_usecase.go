package usecase

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	"predifutbol/backend/internal/domain"
	"predifutbol/backend/pkg/media"
)

type ExportUsecase struct {
	renderer *media.MediaRenderer
	jobs     sync.Map
}

func NewExportUsecase(renderer *media.MediaRenderer) *ExportUsecase {
	return &ExportUsecase{
		renderer: renderer,
	}
}

func (u *ExportUsecase) StartJob(p *domain.Prediction, format domain.ExportFormat, langs []string, port int) (*domain.ExportJob, error) {
	jobID := fmt.Sprintf("job_%d", time.Now().UnixNano())

	job := &domain.ExportJob{
		ID:        jobID,
		Format:    format,
		Status:    domain.ExportStatusRunning,
		Percent:   0,
		Stage:     "En cola...",
		StartedAt: time.Now(),
		Files:     make([]domain.ExportFile, 0),
	}

	u.jobs.Store(jobID, job)

	// Launch in background goroutine
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
		defer cancel()

		opts := media.ExportOptions{
			Prediction: p,
			Format:     format,
			Langs:      langs,
			Port:       port,
			OnProgress: func(percent float64, stage string, frame, totalFrames int, etaSec *int) {
				job.Percent = math.Round(percent*10) / 10
				job.Stage = stage
				job.Frame = frame
				job.TotalFrames = totalFrames
				job.ETASec = etaSec
				job.ElapsedSec = int(time.Since(job.StartedAt).Seconds())
			},
		}

		files, err := u.renderer.Render(ctx, opts)
		if err != nil {
			job.Status = domain.ExportStatusError
			job.Error = err.Error()
			job.Stage = "Error en renderizado"
		} else {
			job.Status = domain.ExportStatusDone
			job.Percent = 100
			job.Stage = "Completado"
			job.Files = files
			job.ElapsedSec = int(time.Since(job.StartedAt).Seconds())
		}

		// Keep in memory for 30 minutes, then cleanup
		time.AfterFunc(30*time.Minute, func() {
			u.jobs.Delete(jobID)
		})
	}()

	return job, nil
}

func (u *ExportUsecase) GetJob(id string) (*domain.ExportJob, error) {
	val, ok := u.jobs.Load(id)
	if !ok {
		return nil, domain.ErrNotFound
	}
	job, ok := val.(*domain.ExportJob)
	if !ok {
		return nil, domain.ErrInternal
	}
	job.ElapsedSec = int(time.Since(job.StartedAt).Seconds())
	return job, nil
}
