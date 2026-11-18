package repository_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"predifutbol/backend/internal/domain"
	"predifutbol/backend/internal/repository"
)

func TestLocalStoreRepository_PredictionLifecycle(t *testing.T) {
	tempDir := t.TempDir()
	storePath := filepath.Join(tempDir, "local-store.json")

	store, err := repository.NewLocalStore(storePath)
	if err != nil {
		t.Fatalf("failed to create LocalStore: %v", err)
	}
	repo := repository.NewLocalStorePredictionRepo(store)

	ctx := context.Background()

	// 1. Insert prediction
	newPred := &domain.Prediction{
		LeagueName:   "Premier League",
		HomeName:     "Arsenal",
		HomeFlag:     "https://example.com/arsenal.png",
		AwayName:     "Chelsea",
		AwayFlag:     "https://example.com/chelsea.png",
		CustomPickES: "Gana Local",
		CustomPickEN: "Home Win",
		Odd:          1.95,
		Probability:  65,
		WasRight:     2, // Pending
		Theme:        "emerald",
	}

	saved, err := repo.Save(ctx, newPred)
	if err != nil {
		t.Fatalf("failed to save prediction: %v", err)
	}
	if saved.ID != 1 {
		t.Errorf("expected auto-assigned ID 1, got %d", saved.ID)
	}

	// 2. Find by ID
	found, err := repo.FindByID(ctx, 1)
	if err != nil {
		t.Fatalf("failed to find prediction: %v", err)
	}
	if found.HomeName != "Arsenal" {
		t.Errorf("expected HomeName 'Arsenal', got '%s'", found.HomeName)
	}

	// 3. Update prediction
	found.WasRight = 1 // Won
	updated, err := repo.Save(ctx, found)
	if err != nil {
		t.Fatalf("failed to update prediction: %v", err)
	}
	if updated.WasRight != 1 {
		t.Errorf("expected WasRight 1, got %d", updated.WasRight)
	}

	// 4. List with Search
	listRes, err := repo.List(ctx, domain.PredictionFilter{Search: "chelsea", Page: 1, Limit: 10})
	if err != nil {
		t.Fatalf("failed to list predictions: %v", err)
	}
	if listRes.Total != 1 {
		t.Errorf("expected 1 result, got %d", listRes.Total)
	}

	// 5. Delete
	if err := repo.Delete(ctx, 1); err != nil {
		t.Fatalf("failed to delete prediction: %v", err)
	}

	_, err = repo.FindByID(ctx, 1)
	if err != domain.ErrNotFound {
		t.Errorf("expected ErrNotFound after deletion, got %v", err)
	}
}

func TestLocalStoreRepository_FixtureSearchAndUpsert(t *testing.T) {
	tempDir := t.TempDir()
	storePath := filepath.Join(tempDir, "local-store.json")

	store, err := repository.NewLocalStore(storePath)
	if err != nil {
		t.Fatalf("failed to create LocalStore: %v", err)
	}
	repo := repository.NewLocalStoreFixtureRepo(store)

	ctx := context.Background()
	now := time.Now()

	fixtures := []domain.Fixture{
		{
			ID:         501,
			HomeName:   "Barcelona",
			AwayName:   "Real Madrid",
			LeagueName: "La Liga",
			Date:       &now,
			Timestamp:  now.Unix(),
		},
	}

	count, err := repo.UpsertBatch(ctx, fixtures)
	if err != nil {
		t.Fatalf("failed to upsert fixtures: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 fixture upserted, got %d", count)
	}

	results, err := repo.Search(ctx, domain.FixtureFilter{Query: "barcelona", Limit: 10})
	if err != nil {
		t.Fatalf("failed to search fixtures: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].HomeName != "Barcelona" {
		t.Errorf("expected HomeName 'Barcelona', got '%s'", results[0].HomeName)
	}
}
