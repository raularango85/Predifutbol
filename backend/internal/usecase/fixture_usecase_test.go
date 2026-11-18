package usecase_test

import (
	"context"
	"testing"
	"time"

	"predifutbol/backend/internal/domain"
	"predifutbol/backend/internal/usecase"
)

type mockFixtureRepo struct {
	fixtures []domain.Fixture
}

func (m *mockFixtureRepo) Search(ctx context.Context, filter domain.FixtureFilter) ([]domain.Fixture, error) {
	var res []domain.Fixture
	for _, f := range m.fixtures {
		if filter.Query != "" && f.HomeName != filter.Query && f.AwayName != filter.Query {
			continue
		}
		res = append(res, f)
	}
	return res, nil
}

func (m *mockFixtureRepo) UpsertBatch(ctx context.Context, fixtures []domain.Fixture) (int, error) {
	m.fixtures = append(m.fixtures, fixtures...)
	return len(fixtures), nil
}

func (m *mockFixtureRepo) FindByID(ctx context.Context, id int64) (*domain.Fixture, error) {
	for _, f := range m.fixtures {
		if f.ID == id {
			return &f, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockFixtureRepo) UpdateScore(ctx context.Context, fixtureID int64, goalHome, goalAway int, statusShort string) error {
	for i, f := range m.fixtures {
		if f.ID == fixtureID {
			m.fixtures[i].GoalHome = &goalHome
			m.fixtures[i].GoalAway = &goalAway
			m.fixtures[i].StatusShort = statusShort
			return nil
		}
	}
	return nil
}

func TestFixtureUsecase_Search(t *testing.T) {
	now := time.Now()
	repo := &mockFixtureRepo{
		fixtures: []domain.Fixture{
			{
				ID:            101,
				HomeName:      "Palmeiras",
				AwayName:      "Once Caldas",
				LeagueName:    "Copa Libertadores",
				LeagueCountry: "South America",
				Date:          &now,
				VenueName:     "Allianz Parque",
				VenueCity:     "São Paulo",
			},
		},
	}

	uc := usecase.NewFixtureUsecase(repo, "", "", "")
	res, err := uc.Search(context.Background(), domain.FixtureFilter{Query: "Palmeiras"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res) != 1 {
		t.Fatalf("expected 1 fixture, got %d", len(res))
	}
	if res[0].HomeName != "Palmeiras" {
		t.Errorf("expected HomeName 'Palmeiras', got '%s'", res[0].HomeName)
	}
}
