package repository_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"predifutbol/backend/internal/domain"
	"predifutbol/backend/internal/repository"
)

func TestSeedCacheRepository(t *testing.T) {
	// Create temporary mock seed cache JSON
	tempDir := t.TempDir()
	cachePath := filepath.Join(tempDir, "mock_seed_cache.json")

	mockData := `{
		"countries": [{"id": 1, "name": "Colombia", "code": "CO", "flag": "co.svg"}],
		"venues": [{"id": 10, "name": "Atanasio Girardot", "city": "Medellin"}],
		"leagues": [{"id": 240, "name": "Liga BetPlay", "type": "League", "country_id": 1}],
		"teams": [
			{"id": 100, "name": "Atletico Nacional", "country": "Colombia", "venue_id": 10},
			{"id": 101, "name": "Millonarios", "country": "Colombia"}
		],
		"type_predictions": [{"id": 1, "name": "classic", "label_es": "1X2", "label_en": "Match Result", "valid_values": "1,X,2"}]
	}`
	if err := os.WriteFile(cachePath, []byte(mockData), 0644); err != nil {
		t.Fatalf("failed to write mock cache file: %v", err)
	}

	store, err := repository.NewSeedCacheStore(cachePath)
	if err != nil {
		t.Fatalf("failed to create SeedCacheStore: %v", err)
	}

	ctx := context.Background()

	// Test Team Search
	teamRepo := repository.NewSeedCacheTeamRepo(store)
	teams, err := teamRepo.Search(ctx, "nacional", 10)
	if err != nil {
		t.Fatalf("teamRepo.Search failed: %v", err)
	}
	if len(teams) != 1 {
		t.Fatalf("expected 1 team, got %d", len(teams))
	}
	if teams[0].Name != "Atletico Nacional" {
		t.Errorf("expected team name 'Atletico Nacional', got '%s'", teams[0].Name)
	}
	if teams[0].VenueName != "Atanasio Girardot" {
		t.Errorf("expected venue name 'Atanasio Girardot', got '%s'", teams[0].VenueName)
	}
	if teams[0].Flag != "co.svg" {
		t.Errorf("expected flag 'co.svg', got '%s'", teams[0].Flag)
	}

	// Test Team FindByID
	team, err := teamRepo.FindByID(ctx, 100)
	if err != nil {
		t.Fatalf("teamRepo.FindByID failed: %v", err)
	}
	if team.ID != 100 {
		t.Errorf("expected ID 100, got %d", team.ID)
	}

	_, err = teamRepo.FindByID(ctx, 9999)
	if err != domain.ErrNotFound {
		t.Errorf("expected ErrNotFound for non-existent ID, got %v", err)
	}

	// Test League Search & Join
	leagueRepo := repository.NewSeedCacheLeagueRepo(store)
	leagues, err := leagueRepo.Search(ctx, "betplay", 10)
	if err != nil {
		t.Fatalf("leagueRepo.Search failed: %v", err)
	}
	if len(leagues) != 1 {
		t.Fatalf("expected 1 league, got %d", len(leagues))
	}
	if leagues[0].CountryName != "Colombia" {
		t.Errorf("expected country 'Colombia', got '%s'", leagues[0].CountryName)
	}

	// Test Type Predictions
	typeRepo := repository.NewSeedCacheTypePredictionRepo(store)
	types, err := typeRepo.FindAll(ctx)
	if err != nil {
		t.Fatalf("typeRepo.FindAll failed: %v", err)
	}
	if len(types) != 1 {
		t.Fatalf("expected 1 type, got %d", len(types))
	}
}
