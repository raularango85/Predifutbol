package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"predifutbol/backend/internal/domain"
	"predifutbol/backend/pkg/formatter"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// ---------------------------------------------------------------------------
// PredictionRepository Implementation
// ---------------------------------------------------------------------------

func (r *PostgresRepository) List(ctx context.Context, filter domain.PredictionFilter) (*domain.PredictionListResult, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	search := strings.TrimSpace(filter.Search)
	var countQuery string
	var listQuery string
	var args []any

	if search != "" {
		countQuery = `
			SELECT COUNT(*) FROM predictions 
			WHERE home_name ILIKE $1 OR away_name ILIKE $1 OR league_name ILIKE $1 
			   OR custom_pick_es ILIKE $1 OR custom_pick_en ILIKE $1
		`
		listQuery = `
			SELECT id, fixture_id, league_id, league_name, league_logo,
			       home_team_id, home_name, home_flag, away_team_id, away_name, away_flag,
			       stadium, match_date_text, type_prediction_id, prediction_value,
			       custom_pick_en, custom_pick_es, odd, stake_bet, probability,
			       is_vip, was_right, stats_en, stats_es, theme, created_at, updated_at
			FROM predictions
			WHERE home_name ILIKE $1 OR away_name ILIKE $1 OR league_name ILIKE $1 
			   OR custom_pick_es ILIKE $1 OR custom_pick_en ILIKE $1
			ORDER BY created_at DESC
			LIMIT $2 OFFSET $3
		`
		args = append(args, "%"+search+"%", limit, offset)
	} else {
		countQuery = `SELECT COUNT(*) FROM predictions`
		listQuery = `
			SELECT id, fixture_id, league_id, league_name, league_logo,
			       home_team_id, home_name, home_flag, away_team_id, away_name, away_flag,
			       stadium, match_date_text, type_prediction_id, prediction_value,
			       custom_pick_en, custom_pick_es, odd, stake_bet, probability,
			       is_vip, was_right, stats_en, stats_es, theme, created_at, updated_at
			FROM predictions
			ORDER BY created_at DESC
			LIMIT $1 OFFSET $2
		`
		args = append(args, limit, offset)
	}

	var total int
	if search != "" {
		if err := r.pool.QueryRow(ctx, countQuery, "%"+search+"%").Scan(&total); err != nil {
			return nil, fmt.Errorf("postgres_repo/count: %w", err)
		}
	} else {
		if err := r.pool.QueryRow(ctx, countQuery).Scan(&total); err != nil {
			return nil, fmt.Errorf("postgres_repo/count: %w", err)
		}
	}

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("postgres_repo/listQuery: %w", err)
	}
	defer rows.Close()

	predictions := make([]domain.Prediction, 0, limit)
	for rows.Next() {
		var p domain.Prediction
		var statsENBytes, statsESBytes []byte

		err := rows.Scan(
			&p.ID, &p.FixtureID, &p.LeagueID, &p.LeagueName, &p.LeagueLogo,
			&p.HomeTeamID, &p.HomeName, &p.HomeFlag, &p.AwayTeamID, &p.AwayName, &p.AwayFlag,
			&p.Stadium, &p.MatchDateText, &p.TypePredictionID, &p.PredictionValue,
			&p.CustomPickEN, &p.CustomPickES, &p.Odd, &p.StakeBet, &p.Probability,
			&p.IsVIP, &p.WasRight, &statsENBytes, &statsESBytes, &p.Theme, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("postgres_repo/scan: %w", err)
		}

		_ = json.Unmarshal(statsENBytes, &p.StatsEN)
		_ = json.Unmarshal(statsESBytes, &p.StatsES)
		predictions = append(predictions, p)
	}

	totalPages := (total + limit - 1) / limit
	if totalPages == 0 {
		totalPages = 1
	}

	return &domain.PredictionListResult{
		Predictions: predictions,
		Total:       total,
		Page:        page,
		Limit:       limit,
		TotalPages:  totalPages,
	}, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id int64) (*domain.Prediction, error) {
	query := `
		SELECT id, fixture_id, league_id, league_name, league_logo,
		       home_team_id, home_name, home_flag, away_team_id, away_name, away_flag,
		       stadium, match_date_text, type_prediction_id, prediction_value,
		       custom_pick_en, custom_pick_es, odd, stake_bet, probability,
		       is_vip, was_right, stats_en, stats_es, theme, created_at, updated_at
		FROM predictions
		WHERE id = $1
	`
	var p domain.Prediction
	var statsENBytes, statsESBytes []byte

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.FixtureID, &p.LeagueID, &p.LeagueName, &p.LeagueLogo,
		&p.HomeTeamID, &p.HomeName, &p.HomeFlag, &p.AwayTeamID, &p.AwayName, &p.AwayFlag,
		&p.Stadium, &p.MatchDateText, &p.TypePredictionID, &p.PredictionValue,
		&p.CustomPickEN, &p.CustomPickES, &p.Odd, &p.StakeBet, &p.Probability,
		&p.IsVIP, &p.WasRight, &statsENBytes, &statsESBytes, &p.Theme, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("postgres_repo/findByID: %w", err)
	}

	_ = json.Unmarshal(statsENBytes, &p.StatsEN)
	_ = json.Unmarshal(statsESBytes, &p.StatsES)
	return &p, nil
}

func (r *PostgresRepository) Save(ctx context.Context, pred *domain.Prediction) (*domain.Prediction, error) {
	statsENBytes, _ := json.Marshal(pred.StatsEN)
	statsESBytes, _ := json.Marshal(pred.StatsES)
	now := time.Now()

	if pred.ID > 0 {
		query := `
			UPDATE predictions SET
				fixture_id = $1, league_id = $2, league_name = $3, league_logo = $4,
				home_team_id = $5, home_name = $6, home_flag = $7, away_team_id = $8,
				away_name = $9, away_flag = $10, stadium = $11, match_date_text = $12,
				type_prediction_id = $13, prediction_value = $14, custom_pick_en = $15,
				custom_pick_es = $16, odd = $17, stake_bet = $18, probability = $19,
				is_vip = $20, was_right = $21, stats_en = $22, stats_es = $23,
				theme = $24, updated_at = $25
			WHERE id = $26
			RETURNING updated_at
		`
		err := r.pool.QueryRow(ctx, query,
			pred.FixtureID, pred.LeagueID, pred.LeagueName, pred.LeagueLogo,
			pred.HomeTeamID, pred.HomeName, pred.HomeFlag, pred.AwayTeamID,
			pred.AwayName, pred.AwayFlag, pred.Stadium, pred.MatchDateText,
			pred.TypePredictionID, pred.PredictionValue, pred.CustomPickEN,
			pred.CustomPickES, pred.Odd, pred.StakeBet, pred.Probability,
			pred.IsVIP, pred.WasRight, statsENBytes, statsESBytes,
			pred.Theme, now, pred.ID,
		).Scan(&pred.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("postgres_repo/update: %w", err)
		}
		return pred, nil
	}

	query := `
		INSERT INTO predictions (
			fixture_id, league_id, league_name, league_logo,
			home_team_id, home_name, home_flag, away_team_id,
			away_name, away_flag, stadium, match_date_text,
			type_prediction_id, prediction_value, custom_pick_en,
			custom_pick_es, odd, stake_bet, probability,
			is_vip, was_right, stats_en, stats_es, theme, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
			$23, $24, $25, $26
		)
		RETURNING id, created_at, updated_at
	`
	err := r.pool.QueryRow(ctx, query,
		pred.FixtureID, pred.LeagueID, pred.LeagueName, pred.LeagueLogo,
		pred.HomeTeamID, pred.HomeName, pred.HomeFlag, pred.AwayTeamID,
		pred.AwayName, pred.AwayFlag, pred.Stadium, pred.MatchDateText,
		pred.TypePredictionID, pred.PredictionValue, pred.CustomPickEN,
		pred.CustomPickES, pred.Odd, pred.StakeBet, pred.Probability,
		pred.IsVIP, pred.WasRight, statsENBytes, statsESBytes, pred.Theme, now, now,
	).Scan(&pred.ID, &pred.CreatedAt, &pred.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("postgres_repo/insert: %w", err)
	}

	return pred, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id int64) error {
	cmdTag, err := r.pool.Exec(ctx, "DELETE FROM predictions WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("postgres_repo/delete: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *PostgresRepository) GetPending(ctx context.Context) ([]domain.Prediction, error) {
	query := `
		SELECT id, fixture_id, league_id, league_name, league_logo,
		       home_team_id, home_name, home_flag, away_team_id, away_name, away_flag,
		       stadium, match_date_text, type_prediction_id, prediction_value,
		       custom_pick_en, custom_pick_es, odd, stake_bet, probability,
		       is_vip, was_right, stats_en, stats_es, theme, created_at, updated_at
		FROM predictions
		WHERE was_right = 2
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("postgres_repo/getPending: %w", err)
	}
	defer rows.Close()

	var pending []domain.Prediction
	for rows.Next() {
		var p domain.Prediction
		var statsENBytes, statsESBytes []byte
		err := rows.Scan(
			&p.ID, &p.FixtureID, &p.LeagueID, &p.LeagueName, &p.LeagueLogo,
			&p.HomeTeamID, &p.HomeName, &p.HomeFlag, &p.AwayTeamID, &p.AwayName, &p.AwayFlag,
			&p.Stadium, &p.MatchDateText, &p.TypePredictionID, &p.PredictionValue,
			&p.CustomPickEN, &p.CustomPickES, &p.Odd, &p.StakeBet, &p.Probability,
			&p.IsVIP, &p.WasRight, &statsENBytes, &statsESBytes, &p.Theme, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("postgres_repo/getPendingScan: %w", err)
		}
		_ = json.Unmarshal(statsENBytes, &p.StatsEN)
		_ = json.Unmarshal(statsESBytes, &p.StatsES)
		pending = append(pending, p)
	}
	return pending, nil
}

// ---------------------------------------------------------------------------
// PostgresFixtureRepo
// ---------------------------------------------------------------------------

type PostgresFixtureRepo struct {
	pool *pgxpool.Pool
}

func NewPostgresFixtureRepo(pool *pgxpool.Pool) domain.FixtureRepository {
	return &PostgresFixtureRepo{pool: pool}
}

func (r *PostgresFixtureRepo) Search(ctx context.Context, filter domain.FixtureFilter) ([]domain.Fixture, error) {
	q := strings.TrimSpace(filter.Query)
	date := strings.TrimSpace(filter.Date)
	limit := filter.Limit
	if limit <= 0 || limit > 150 {
		limit = 30
	}

	nowEpoch := time.Now().Unix() - 300 // 5 min grace window

	baseSQL := `
		SELECT f.id,
		       f.date,
		       f.timestamp,
		       COALESCE(f.timezone, 'America/Bogota'),
		       COALESCE(f.referee, ''),
		       f.goal_home,
		       f.goal_away,
		       COALESCE(f.venue_name, v.name, '') AS venue_name,
		       COALESCE(f.venue_city, v.city, '') AS venue_city,
		       COALESCE(fs.short, 'NS') AS status_short,
		       f.league_id,
		       l.name AS league_name,
		       COALESCE(l.logo, '') AS league_logo,
		       COALESCE(c.name, th.country, '') AS league_country,
		       f.team_home_id AS home_id,
		       th.name AS home_name,
		       COALESCE(th.logo, '') AS home_logo,
		       f.team_away_id AS away_id,
		       ta.name AS away_name,
		       COALESCE(ta.logo, '') AS away_logo
		FROM fixtures f
		JOIN teams th ON th.id = f.team_home_id
		JOIN teams ta ON ta.id = f.team_away_id
		JOIN leagues l ON l.id = f.league_id
		LEFT JOIN countries c ON c.id = l.country_id
		LEFT JOIN venues v ON v.id = COALESCE(f.venue_id, th.venue_id)
		LEFT JOIN fixtures_status fs ON fs.id = f.status_id
		WHERE 1=1
	`

	var conditions []string
	var args []any
	argIdx := 1

	if date != "" {
		conditions = append(conditions, fmt.Sprintf("TO_CHAR(f.date, 'YYYY-MM-DD') LIKE $%d", argIdx))
		args = append(args, date+"%")
		argIdx++
	}

	if q != "" {
		conditions = append(conditions, fmt.Sprintf("(th.name ILIKE $%d OR ta.name ILIKE $%d OR l.name ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+q+"%")
		argIdx++
	}

	if filter.UpcomingOnly {
		conditions = append(conditions, fmt.Sprintf("(f.timestamp IS NOT NULL AND f.timestamp >= $%d)", argIdx))
		args = append(args, nowEpoch)
		argIdx++
	}

	for _, cond := range conditions {
		baseSQL += " AND " + cond
	}

	baseSQL += fmt.Sprintf(" ORDER BY f.date ASC LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := r.pool.Query(ctx, baseSQL, args...)
	if err != nil {
		return nil, fmt.Errorf("postgres_fixture_repo/search: %w", err)
	}
	defer rows.Close()

	results := make([]domain.Fixture, 0, limit)
	for rows.Next() {
		var f domain.Fixture
		err := rows.Scan(
			&f.ID, &f.Date, &f.Timestamp, &f.Timezone, &f.Referee,
			&f.GoalHome, &f.GoalAway, &f.VenueName, &f.VenueCity,
			&f.StatusShort, &f.LeagueID, &f.LeagueName, &f.LeagueLogo,
			&f.LeagueCountry, &f.HomeID, &f.HomeName, &f.HomeLogo,
			&f.AwayID, &f.AwayName, &f.AwayLogo,
		)
		if err != nil {
			return nil, fmt.Errorf("postgres_fixture_repo/scan: %w", err)
		}
		if f.Timestamp > 0 {
			utc := time.Unix(f.Timestamp, 0).UTC()
			f.Date = &utc
		}
		f.HomeNameES = formatter.TranslateTeamName(f.HomeName, "es")
		f.AwayNameES = formatter.TranslateTeamName(f.AwayName, "es")
		results = append(results, f)
	}

	return results, nil
}

func (r *PostgresFixtureRepo) UpsertBatch(ctx context.Context, fixtures []domain.Fixture) (int, error) {
	upserted := 0
	for _, f := range fixtures {
		query := `
			INSERT INTO fixtures (id, date, timestamp, timezone, referee, venue_name, venue_city, goal_home, goal_away, team_home_id, team_away_id, league_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			ON CONFLICT (id) DO UPDATE SET
				date = EXCLUDED.date,
				timestamp = EXCLUDED.timestamp,
				timezone = EXCLUDED.timezone,
				referee = EXCLUDED.referee,
				venue_name = EXCLUDED.venue_name,
				venue_city = EXCLUDED.venue_city,
				goal_home = EXCLUDED.goal_home,
				goal_away = EXCLUDED.goal_away
		`
		_, err := r.pool.Exec(ctx, query,
			f.ID, f.Date, f.Timestamp, f.Timezone, f.Referee,
			f.VenueName, f.VenueCity, f.GoalHome, f.GoalAway,
			f.HomeID, f.AwayID, f.LeagueID,
		)
		if err == nil {
			upserted++
		}
	}
	return upserted, nil
}

func (r *PostgresFixtureRepo) FindByID(ctx context.Context, id int64) (*domain.Fixture, error) {
	query := `
		SELECT f.id, f.date, f.timestamp, COALESCE(f.timezone, 'America/Bogota'), COALESCE(f.referee, ''),
		       f.goal_home, f.goal_away, COALESCE(f.venue_name, v.name, ''), COALESCE(f.venue_city, v.city, ''),
		       COALESCE(fs.short, 'NS'), f.league_id, l.name, COALESCE(l.logo, ''), COALESCE(c.name, th.country, ''),
		       f.team_home_id, th.name, COALESCE(th.logo, ''), f.team_away_id, ta.name, COALESCE(ta.logo, '')
		FROM fixtures f
		JOIN teams th ON th.id = f.team_home_id
		JOIN teams ta ON ta.id = f.team_away_id
		JOIN leagues l ON l.id = f.league_id
		LEFT JOIN countries c ON c.id = l.country_id
		LEFT JOIN venues v ON v.id = COALESCE(f.venue_id, th.venue_id)
		LEFT JOIN fixtures_status fs ON fs.id = f.status_id
		WHERE f.id = $1
	`
	var f domain.Fixture
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&f.ID, &f.Date, &f.Timestamp, &f.Timezone, &f.Referee,
		&f.GoalHome, &f.GoalAway, &f.VenueName, &f.VenueCity,
		&f.StatusShort, &f.LeagueID, &f.LeagueName, &f.LeagueLogo,
		&f.LeagueCountry, &f.HomeID, &f.HomeName, &f.HomeLogo,
		&f.AwayID, &f.AwayName, &f.AwayLogo,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("postgres_fixture_repo/findByID: %w", err)
	}
	if f.Timestamp > 0 {
		utc := time.Unix(f.Timestamp, 0).UTC()
		f.Date = &utc
	}
	f.HomeNameES = formatter.TranslateTeamName(f.HomeName, "es")
	f.AwayNameES = formatter.TranslateTeamName(f.AwayName, "es")
	return &f, nil
}

func (r *PostgresFixtureRepo) UpdateScore(ctx context.Context, fixtureID int64, goalHome, goalAway int, statusShort string) error {
	query := `
		UPDATE fixtures
		SET goal_home = $1, goal_away = $2, status_id = 8
		WHERE id = $3
	`
	_, err := r.pool.Exec(ctx, query, goalHome, goalAway, fixtureID)
	if err != nil {
		return fmt.Errorf("postgres_fixture_repo/updateScore: %w", err)
	}
	return nil
}
