package usecase_test

import (
	"context"
	"testing"

	"predifutbol/backend/internal/domain"
	"predifutbol/backend/internal/usecase"
)

type mockPredictionRepo struct {
	preds map[int64]domain.Prediction
}

func (m *mockPredictionRepo) List(ctx context.Context, filter domain.PredictionFilter) (*domain.PredictionListResult, error) {
	list := make([]domain.Prediction, 0, len(m.preds))
	for _, p := range m.preds {
		list = append(list, p)
	}
	return &domain.PredictionListResult{Predictions: list, Total: len(list), Page: 1, Limit: 10, TotalPages: 1}, nil
}

func (m *mockPredictionRepo) FindByID(ctx context.Context, id int64) (*domain.Prediction, error) {
	p, ok := m.preds[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return &p, nil
}

func (m *mockPredictionRepo) Save(ctx context.Context, pred *domain.Prediction) (*domain.Prediction, error) {
	if pred.ID == 0 {
		pred.ID = int64(len(m.preds) + 1)
	}
	m.preds[pred.ID] = *pred
	return pred, nil
}

func (m *mockPredictionRepo) Delete(ctx context.Context, id int64) error {
	delete(m.preds, id)
	return nil
}

func (m *mockPredictionRepo) GetPending(ctx context.Context) ([]domain.Prediction, error) {
	pending := make([]domain.Prediction, 0)
	for _, p := range m.preds {
		if p.WasRight == 2 {
			pending = append(pending, p)
		}
	}
	return pending, nil
}

func TestPredictionUsecase_SaveAndEnrich(t *testing.T) {
	repo := &mockPredictionRepo{preds: make(map[int64]domain.Prediction)}
	uc := usecase.NewPredictionUsecase(repo, nil, "", "", "")

	ctx := context.Background()
	type1 := 1

	input := &domain.Prediction{
		HomeName:         "Liverpool",
		AwayName:         "Real Madrid",
		LeagueName:       "UEFA Champions League",
		TypePredictionID: &type1,
		PredictionValue:  "1",
	}

	saved, err := uc.Save(ctx, input)
	if err != nil {
		t.Fatalf("failed to save prediction: %v", err)
	}

	if saved.ID != 1 {
		t.Errorf("expected ID 1, got %d", saved.ID)
	}
	if saved.CustomPickES != "Gana Local" {
		t.Errorf("expected CustomPickES 'Gana Local', got '%s'", saved.CustomPickES)
	}
	if saved.CustomPickEN != "Home Win" {
		t.Errorf("expected CustomPickEN 'Home Win', got '%s'", saved.CustomPickEN)
	}
	if saved.TikTokCaption == "" {
		t.Errorf("expected non-empty TikTokCaption")
	}
	if saved.TikTokHashtags == "" {
		t.Errorf("expected non-empty TikTokHashtags")
	}
}

func TestPredictionUsecase_Settle(t *testing.T) {
	type1 := 1
	repo := &mockPredictionRepo{
		preds: map[int64]domain.Prediction{
			1: {
				ID:               1,
				HomeName:         "Arsenal",
				AwayName:         "Chelsea",
				TypePredictionID: &type1,
				PredictionValue:  "1",
				WasRight:         2, // Pending
			},
		},
	}
	uc := usecase.NewPredictionUsecase(repo, nil, "", "", "")
	ctx := context.Background()

	result, err := uc.Settle(ctx, 1, 3, 1)
	if err != nil {
		t.Fatalf("failed to settle prediction: %v", err)
	}
	if result.WasRight != 1 {
		t.Errorf("expected WasRight 1 (WON), got %d", result.WasRight)
	}
	if result.Status != "WON" {
		t.Errorf("expected status 'WON', got '%s'", result.Status)
	}
}

func TestPredictionUsecase_CheckAllPending(t *testing.T) {
	type1 := 1
	type9 := 9
	fix1 := int64(101)
	fix2 := int64(102)

	gHome1 := 2
	gAway1 := 1
	gHome2 := 0
	gAway2 := 2

	fixtureRepo := &mockFixtureRepo{
		fixtures: []domain.Fixture{
			{
				ID:          101,
				GoalHome:    &gHome1,
				GoalAway:    &gAway1,
				StatusShort: "FT",
			},
			{
				ID:          102,
				GoalHome:    &gHome2,
				GoalAway:    &gAway2,
				StatusShort: "FT",
			},
		},
	}

	repo := &mockPredictionRepo{
		preds: map[int64]domain.Prediction{
			1: {
				ID:               1,
				FixtureID:        &fix1,
				HomeName:         "Liverpool",
				AwayName:         "Everton",
				TypePredictionID: &type1,
				PredictionValue:  "1",
				CustomPickES:     "Gana Local",
				WasRight:         2,
			},
			2: {
				ID:               2,
				FixtureID:        &fix2,
				HomeName:         "Juventus",
				AwayName:         "Milan",
				TypePredictionID: &type9,
				PredictionValue:  "YES",
				CustomPickES:     "Ambos Equipos Marcan: SÍ",
				WasRight:         2,
			},
		},
	}

	uc := usecase.NewPredictionUsecase(repo, fixtureRepo, "", "", "")
	ctx := context.Background()

	summary, err := uc.CheckAllPending(ctx)
	if err != nil {
		t.Fatalf("failed to check all predictions: %v", err)
	}

	if summary.TotalPending != 2 {
		t.Errorf("expected TotalPending 2, got %d", summary.TotalPending)
	}
	if summary.Settled != 2 {
		t.Errorf("expected Settled 2, got %d", summary.Settled)
	}
	if summary.Won != 1 {
		t.Errorf("expected Won 1, got %d", summary.Won)
	}
	if summary.Lost != 1 {
		t.Errorf("expected Lost 1, got %d", summary.Lost)
	}
	if summary.WinRate != 50.0 {
		t.Errorf("expected WinRate 50.0, got %f", summary.WinRate)
	}
	if len(summary.Results) != 2 {
		t.Errorf("expected 2 results, got %d", len(summary.Results))
	}
}
