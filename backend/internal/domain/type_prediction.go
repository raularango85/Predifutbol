package domain

import "context"

type TypePrediction struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	LabelES     string `json:"label_es"`
	LabelEN     string `json:"label_en"`
	ValidValues string `json:"valid_values"`
}

type TypePredictionRepository interface {
	FindAll(ctx context.Context) ([]TypePrediction, error)
	FindByID(ctx context.Context, id int) (*TypePrediction, error)
}
