package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"predifutbol/backend/internal/domain"
)

type localStoreData struct {
	Predictions []domain.Prediction `json:"predictions"`
	Fixtures    []domain.Fixture    `json:"fixtures"`
}

type LocalStore struct {
	mu       sync.RWMutex
	filePath string
	data     localStoreData
}

func NewLocalStore(filePath string) (*LocalStore, error) {
	store := &LocalStore{
		filePath: filePath,
		data: localStoreData{
			Predictions: make([]domain.Prediction, 0),
			Fixtures:    make([]domain.Fixture, 0),
		},
	}

	if _, err := os.Stat(filePath); err == nil {
		content, err := os.ReadFile(filePath)
		if err != nil {
			return nil, fmt.Errorf("local_store/readFile: %w", err)
		}
		if len(content) > 0 {
			if err := json.Unmarshal(content, &store.data); err != nil {
				return nil, fmt.Errorf("local_store/unmarshal: %w", err)
			}
		}
	}

	return store, nil
}

func (s *LocalStore) persist() error {
	content, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return fmt.Errorf("local_store/marshal: %w", err)
	}
	if err := os.WriteFile(s.filePath, content, 0644); err != nil {
		return fmt.Errorf("local_store/writeFile: %w", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// LocalStorePredictionRepo
// ---------------------------------------------------------------------------

type LocalStorePredictionRepo struct {
	store *LocalStore
}

func NewLocalStorePredictionRepo(store *LocalStore) domain.PredictionRepository {
	return &LocalStorePredictionRepo{store: store}
}

func (r *LocalStorePredictionRepo) List(ctx context.Context, filter domain.PredictionFilter) (*domain.PredictionListResult, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("local_store_prediction_repo/list: %w", err)
	}

	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	search := strings.TrimSpace(strings.ToLower(filter.Search))
	filtered := make([]domain.Prediction, 0, len(r.store.data.Predictions))

	for _, p := range r.store.data.Predictions {
		if search == "" {
			filtered = append(filtered, p)
			continue
		}
		match := strings.Contains(strings.ToLower(p.HomeName), search) ||
			strings.Contains(strings.ToLower(p.AwayName), search) ||
			strings.Contains(strings.ToLower(p.LeagueName), search) ||
			strings.Contains(strings.ToLower(p.CustomPickES), search) ||
			strings.Contains(strings.ToLower(p.CustomPickEN), search)
		if match {
			filtered = append(filtered, p)
		}
	}

	// Sort descending by CreatedAt or ID
	sort.Slice(filtered, func(i, j int) bool {
		if !filtered[i].CreatedAt.IsZero() && !filtered[j].CreatedAt.IsZero() {
			return filtered[i].CreatedAt.After(filtered[j].CreatedAt)
		}
		return filtered[i].ID > filtered[j].ID
	})

	total := len(filtered)
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}

	totalPages := (total + limit - 1) / limit
	if totalPages == 0 {
		totalPages = 1
	}

	start := (page - 1) * limit
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}

	paged := filtered[start:end]
	return &domain.PredictionListResult{
		Predictions: paged,
		Total:       total,
		Page:        page,
		Limit:       limit,
		TotalPages:  totalPages,
	}, nil
}

func (r *LocalStorePredictionRepo) FindByID(ctx context.Context, id int64) (*domain.Prediction, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("local_store_prediction_repo/findByID: %w", err)
	}

	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	for _, p := range r.store.data.Predictions {
		if p.ID == id {
			res := p
			return &res, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (r *LocalStorePredictionRepo) Save(ctx context.Context, pred *domain.Prediction) (*domain.Prediction, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("local_store_prediction_repo/save: %w", err)
	}

	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	now := time.Now()
	if pred.ID > 0 {
		// Update existing
		found := false
		for i, p := range r.store.data.Predictions {
			if p.ID == pred.ID {
				pred.CreatedAt = p.CreatedAt
				pred.UpdatedAt = now
				r.store.data.Predictions[i] = *pred
				found = true
				break
			}
		}
		if !found {
			return nil, domain.ErrNotFound
		}
	} else {
		// Insert new with auto-increment ID
		var maxID int64 = 0
		for _, p := range r.store.data.Predictions {
			if p.ID > maxID {
				maxID = p.ID
			}
		}
		pred.ID = maxID + 1
		pred.CreatedAt = now
		pred.UpdatedAt = now
		r.store.data.Predictions = append(r.store.data.Predictions, *pred)
	}

	if err := r.store.persist(); err != nil {
		return nil, err
	}

	res := *pred
	return &res, nil
}

func (r *LocalStorePredictionRepo) Delete(ctx context.Context, id int64) error {
	if err := ctx.Err(); err != nil {
		return fmt.Errorf("local_store_prediction_repo/delete: %w", err)
	}

	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	found := false
	newPreds := make([]domain.Prediction, 0, len(r.store.data.Predictions))
	for _, p := range r.store.data.Predictions {
		if p.ID == id {
			found = true
			continue
		}
		newPreds = append(newPreds, p)
	}

	if !found {
		return domain.ErrNotFound
	}

	r.store.data.Predictions = newPreds
	return r.store.persist()
}

func (r *LocalStorePredictionRepo) GetPending(ctx context.Context) ([]domain.Prediction, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("local_store_prediction_repo/getPending: %w", err)
	}

	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	pending := make([]domain.Prediction, 0)
	for _, p := range r.store.data.Predictions {
		if p.WasRight == 2 { // 2 = Pending
			pending = append(pending, p)
		}
	}
	return pending, nil
}

// ---------------------------------------------------------------------------
// LocalStoreFixtureRepo
// ---------------------------------------------------------------------------

type LocalStoreFixtureRepo struct {
	store *LocalStore
}

func NewLocalStoreFixtureRepo(store *LocalStore) domain.FixtureRepository {
	return &LocalStoreFixtureRepo{store: store}
}

func (r *LocalStoreFixtureRepo) Search(ctx context.Context, filter domain.FixtureFilter) ([]domain.Fixture, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("local_store_fixture_repo/search: %w", err)
	}

	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	q := strings.TrimSpace(strings.ToLower(filter.Query))
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 30
	}

	now := time.Now().Unix()
	results := make([]domain.Fixture, 0, limit)

	for _, f := range r.store.data.Fixtures {
		if filter.UpcomingOnly && f.Timestamp > 0 && f.Timestamp < now {
			continue
		}
		if filter.Date != "" && f.Date != nil {
			if !strings.HasPrefix(f.Date.Format("2006-01-02"), filter.Date) {
				continue
			}
		}
		if q != "" {
			match := strings.Contains(strings.ToLower(f.HomeName), q) ||
				strings.Contains(strings.ToLower(f.AwayName), q) ||
				strings.Contains(strings.ToLower(f.LeagueName), q) ||
				strings.Contains(strings.ToLower(f.HomeNameES), q) ||
				strings.Contains(strings.ToLower(f.AwayNameES), q)
			if !match {
				continue
			}
		}
		if f.Timestamp > 0 {
			utc := time.Unix(f.Timestamp, 0).UTC()
			f.Date = &utc
		}
		results = append(results, f)
		if len(results) >= limit {
			break
		}
	}

	return results, nil
}

func (r *LocalStoreFixtureRepo) UpsertBatch(ctx context.Context, fixtures []domain.Fixture) (int, error) {
	if err := ctx.Err(); err != nil {
		return 0, fmt.Errorf("local_store_fixture_repo/upsert: %w", err)
	}

	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	fixtureMap := make(map[int64]int, len(r.store.data.Fixtures))
	for i, f := range r.store.data.Fixtures {
		fixtureMap[f.ID] = i
	}

	upserted := 0
	for _, incoming := range fixtures {
		if idx, exists := fixtureMap[incoming.ID]; exists {
			r.store.data.Fixtures[idx] = incoming
		} else {
			r.store.data.Fixtures = append(r.store.data.Fixtures, incoming)
			fixtureMap[incoming.ID] = len(r.store.data.Fixtures) - 1
		}
		upserted++
	}

	if err := r.store.persist(); err != nil {
		return 0, err
	}
	return upserted, nil
}

func (r *LocalStoreFixtureRepo) FindByID(ctx context.Context, id int64) (*domain.Fixture, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("local_store_fixture_repo/findByID: %w", err)
	}

	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	for _, f := range r.store.data.Fixtures {
		if f.ID == id {
			res := f
			if res.Timestamp > 0 {
				utc := time.Unix(res.Timestamp, 0).UTC()
				res.Date = &utc
			}
			return &res, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (r *LocalStoreFixtureRepo) UpdateScore(ctx context.Context, fixtureID int64, goalHome, goalAway int, statusShort string) error {
	if err := ctx.Err(); err != nil {
		return fmt.Errorf("local_store_fixture_repo/updateScore: %w", err)
	}

	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	for i, f := range r.store.data.Fixtures {
		if f.ID == fixtureID {
			h := goalHome
			a := goalAway
			r.store.data.Fixtures[i].GoalHome = &h
			r.store.data.Fixtures[i].GoalAway = &a
			r.store.data.Fixtures[i].StatusShort = statusShort
			return r.store.persist()
		}
	}
	return nil
}
