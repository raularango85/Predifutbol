package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"

	"predifutbol/backend/internal/domain"
)

type rawSeedCache struct {
	Countries       []domain.Country        `json:"countries"`
	Venues          []domain.Venue          `json:"venues"`
	Leagues         []domain.League         `json:"leagues"`
	Teams           []domain.Team           `json:"teams"`
	TypePredictions []domain.TypePrediction `json:"type_predictions"`
}

type SeedCacheStore struct {
	mu              sync.RWMutex
	teams           []domain.Team
	teamsByID       map[int64]domain.Team
	leagues         []domain.League
	leaguesByID     map[int64]domain.League
	venuesByID      map[int64]domain.Venue
	countriesByID   map[int64]domain.Country
	countriesByName map[string]domain.Country
	types           []domain.TypePrediction
	typesByID       map[int]domain.TypePrediction
}

func NewSeedCacheStore(filePath string) (*SeedCacheStore, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("seed_cache_store/readFile: %w", err)
	}

	var raw rawSeedCache
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, fmt.Errorf("seed_cache_store/unmarshal: %w", err)
	}

	store := &SeedCacheStore{
		teamsByID:       make(map[int64]domain.Team, len(raw.Teams)),
		leaguesByID:     make(map[int64]domain.League, len(raw.Leagues)),
		venuesByID:      make(map[int64]domain.Venue, len(raw.Venues)),
		countriesByID:   make(map[int64]domain.Country, len(raw.Countries)),
		countriesByName: make(map[string]domain.Country, len(raw.Countries)),
		typesByID:       make(map[int]domain.TypePrediction, len(raw.TypePredictions)),
	}

	for _, v := range raw.Venues {
		store.venuesByID[v.ID] = v
	}
	for _, c := range raw.Countries {
		store.countriesByID[c.ID] = c
		store.countriesByName[strings.ToLower(c.Name)] = c
	}
	for _, l := range raw.Leagues {
		if l.CountryID != nil {
			if c, ok := store.countriesByID[*l.CountryID]; ok {
				l.CountryName = c.Name
				l.CountryCode = c.Code
				l.CountryFlag = c.Flag
			}
		}
		store.leagues = append(store.leagues, l)
		store.leaguesByID[l.ID] = l
	}
	for _, t := range raw.Teams {
		if t.VenueID != nil {
			if v, ok := store.venuesByID[*t.VenueID]; ok {
				t.VenueName = v.Name
				t.VenueCity = v.City
			}
		}
		if t.Country != "" {
			if c, ok := store.countriesByName[strings.ToLower(t.Country)]; ok {
				t.Flag = c.Flag
			}
		}
		store.teams = append(store.teams, t)
		store.teamsByID[t.ID] = t
	}
	for _, tp := range raw.TypePredictions {
		store.types = append(store.types, tp)
		store.typesByID[tp.ID] = tp
	}

	return store, nil
}

// ---------------------------------------------------------------------------
// Team Repository Implementation
// ---------------------------------------------------------------------------

type SeedCacheTeamRepo struct {
	store *SeedCacheStore
}

func NewSeedCacheTeamRepo(store *SeedCacheStore) domain.TeamRepository {
	return &SeedCacheTeamRepo{store: store}
}

func (r *SeedCacheTeamRepo) Search(ctx context.Context, query string, limit int) ([]domain.Team, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("seed_cache_team_repo/search: %w", err)
	}

	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	q := strings.TrimSpace(strings.ToLower(query))
	if limit <= 0 || limit > 100 {
		limit = 25
	}

	results := make([]domain.Team, 0, limit)
	for _, team := range r.store.teams {
		if q == "" || strings.Contains(strings.ToLower(team.Name), q) || strings.Contains(strings.ToLower(team.Country), q) {
			results = append(results, team)
			if len(results) >= limit {
				break
			}
		}
	}
	return results, nil
}

func (r *SeedCacheTeamRepo) FindByID(ctx context.Context, id int64) (*domain.Team, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("seed_cache_team_repo/findByID: %w", err)
	}

	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	team, ok := r.store.teamsByID[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return &team, nil
}

// ---------------------------------------------------------------------------
// League Repository Implementation
// ---------------------------------------------------------------------------

type SeedCacheLeagueRepo struct {
	store *SeedCacheStore
}

func NewSeedCacheLeagueRepo(store *SeedCacheStore) domain.LeagueRepository {
	return &SeedCacheLeagueRepo{store: store}
}

func (r *SeedCacheLeagueRepo) Search(ctx context.Context, query string, limit int) ([]domain.League, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("seed_cache_league_repo/search: %w", err)
	}

	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	q := strings.TrimSpace(strings.ToLower(query))
	if limit <= 0 || limit > 100 {
		limit = 30
	}

	results := make([]domain.League, 0, limit)
	for _, league := range r.store.leagues {
		if q == "" || strings.Contains(strings.ToLower(league.Name), q) || strings.Contains(strings.ToLower(league.CountryName), q) {
			results = append(results, league)
			if len(results) >= limit {
				break
			}
		}
	}
	return results, nil
}

func (r *SeedCacheLeagueRepo) FindByID(ctx context.Context, id int64) (*domain.League, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("seed_cache_league_repo/findByID: %w", err)
	}

	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	league, ok := r.store.leaguesByID[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return &league, nil
}

// ---------------------------------------------------------------------------
// Type Prediction Repository Implementation
// ---------------------------------------------------------------------------

type SeedCacheTypePredictionRepo struct {
	store *SeedCacheStore
}

func NewSeedCacheTypePredictionRepo(store *SeedCacheStore) domain.TypePredictionRepository {
	return &SeedCacheTypePredictionRepo{store: store}
}

func (r *SeedCacheTypePredictionRepo) FindAll(ctx context.Context) ([]domain.TypePrediction, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("seed_cache_type_repo/findAll: %w", err)
	}

	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	out := make([]domain.TypePrediction, len(r.store.types))
	copy(out, r.store.types)
	return out, nil
}

func (r *SeedCacheTypePredictionRepo) FindByID(ctx context.Context, id int) (*domain.TypePrediction, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("seed_cache_type_repo/findByID: %w", err)
	}

	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	tp, ok := r.store.typesByID[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return &tp, nil
}
