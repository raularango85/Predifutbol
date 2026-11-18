package domain

import (
	"context"
	"time"
)

type Prediction struct {
	ID               int64      `json:"id"`
	FixtureID        *int64     `json:"fixture_id,omitempty"`
	LeagueID         *int64     `json:"league_id,omitempty"`
	LeagueName       string     `json:"league_name"`
	LeagueLogo       *string    `json:"league_logo,omitempty"`
	HomeTeamID       *int64     `json:"home_team_id,omitempty"`
	HomeName         string     `json:"home_name"`
	HomeFlag         string     `json:"home_flag"`
	AwayTeamID       *int64     `json:"away_team_id,omitempty"`
	AwayName         string     `json:"away_name"`
	AwayFlag         string     `json:"away_flag"`
	Stadium          string     `json:"stadium,omitempty"`
	MatchDateText    string     `json:"match_date_text,omitempty"`
	MatchDate        *time.Time `json:"match_date,omitempty"`
	TypePredictionID *int       `json:"type_prediction_id,omitempty"`
	PredictionValue  string     `json:"prediction_value,omitempty"`
	CustomPickEN     string     `json:"custom_pick_en,omitempty"`
	CustomPickES     string     `json:"custom_pick_es,omitempty"`
	Odd              float64    `json:"odd"`
	StakeBet         int        `json:"stake_bet"`
	Probability      int        `json:"probability"`
	IsVIP            bool       `json:"is_vip"`
	WasRight         int        `json:"was_right"` // 0: Lost, 1: Won, 2: Pending, 3: Void
	StatsEN          []string   `json:"stats_en"`
	StatsES          []string   `json:"stats_es"`
	TikTokCaption    string     `json:"tiktok_caption,omitempty"`
	TikTokHashtags   string     `json:"tiktok_hashtags,omitempty"`
	TikTokFullText   string     `json:"tiktok_full_text,omitempty"`
	Theme            string     `json:"theme"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type PredictionFilter struct {
	Search string
	Page   int
	Limit  int
}

type PredictionListResult struct {
	Predictions []Prediction `json:"predictions"`
	Total       int          `json:"total"`
	Page        int          `json:"page"`
	Limit       int          `json:"limit"`
	TotalPages  int          `json:"total_pages"`
}

type PredictionRepository interface {
	List(ctx context.Context, filter PredictionFilter) (*PredictionListResult, error)
	FindByID(ctx context.Context, id int64) (*Prediction, error)
	Save(ctx context.Context, pred *Prediction) (*Prediction, error)
	Delete(ctx context.Context, id int64) error
	GetPending(ctx context.Context) ([]Prediction, error)
}

type CheckItemResult struct {
	ID       int64  `json:"id"`
	HomeName string `json:"home_name"`
	AwayName string `json:"away_name"`
	Score    string `json:"score,omitempty"`
	Pick     string `json:"pick"`
	WasRight int    `json:"was_right"` // 0: Lost, 1: Won, 2: Pending
	Outcome  string `json:"outcome"`   // "Acertada", "Fallada", "Pendiente"
	Source   string `json:"source,omitempty"`
	Reason   string `json:"reason,omitempty"`
}

type CheckAllResult struct {
	TotalPending int               `json:"total_pending"`
	Settled      int               `json:"settled"`
	Won          int               `json:"won"`
	Lost         int               `json:"lost"`
	StillPending int               `json:"still_pending"`
	WinRate      float64           `json:"win_rate"`
	Results      []CheckItemResult `json:"results"`
}

