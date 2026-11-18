package dto

import (
	"time"

	"predifutbol/backend/internal/domain"
)

type SavePredictionRequest struct {
	ID               int64     `json:"id"`
	FixtureID        *int64    `json:"fixture_id"`
	LeagueID         *int64    `json:"league_id"`
	LeagueName       string    `json:"league_name" binding:"required"`
	LeagueLogo       *string   `json:"league_logo"`
	HomeTeamID       *int64    `json:"home_team_id"`
	HomeName         string    `json:"home_name" binding:"required"`
	HomeFlag         string    `json:"home_flag" binding:"required"`
	AwayTeamID       *int64    `json:"away_team_id"`
	AwayName         string    `json:"away_name" binding:"required"`
	AwayFlag         string    `json:"away_flag" binding:"required"`
	Stadium          string    `json:"stadium"`
	MatchDateText    string    `json:"match_date_text"`
	TypePredictionID *int      `json:"type_prediction_id"`
	PredictionValue  string    `json:"prediction_value"`
	CustomPickEN     string    `json:"custom_pick_en"`
	CustomPickES     string    `json:"custom_pick_es"`
	Odd              float64   `json:"odd"`
	StakeBet         int       `json:"stake_bet"`
	Probability      int       `json:"probability"`
	IsVIP            bool      `json:"is_vip"`
	WasRight         int       `json:"was_right"`
	StatsEN          []string  `json:"stats_en"`
	StatsES          []string  `json:"stats_es"`
	Theme            string    `json:"theme"`
}

func (r *SavePredictionRequest) ToDomain() *domain.Prediction {
	return &domain.Prediction{
		ID:               r.ID,
		FixtureID:        r.FixtureID,
		LeagueID:         r.LeagueID,
		LeagueName:       r.LeagueName,
		LeagueLogo:       r.LeagueLogo,
		HomeTeamID:       r.HomeTeamID,
		HomeName:         r.HomeName,
		HomeFlag:         r.HomeFlag,
		AwayTeamID:       r.AwayTeamID,
		AwayName:         r.AwayName,
		AwayFlag:         r.AwayFlag,
		Stadium:          r.Stadium,
		MatchDateText:    r.MatchDateText,
		TypePredictionID: r.TypePredictionID,
		PredictionValue:  r.PredictionValue,
		CustomPickEN:     r.CustomPickEN,
		CustomPickES:     r.CustomPickES,
		Odd:              r.Odd,
		StakeBet:         r.StakeBet,
		Probability:      r.Probability,
		IsVIP:            r.IsVIP,
		WasRight:         r.WasRight,
		StatsEN:          r.StatsEN,
		StatsES:          r.StatsES,
		Theme:            r.Theme,
	}
}

type PredictionResponse struct {
	Success    bool               `json:"success"`
	Prediction *domain.Prediction `json:"prediction,omitempty"`
	Error      string             `json:"error,omitempty"`
}

type SettlePredictionRequest struct {
	HomeGoals int `json:"home_goals" binding:"min=0"`
	AwayGoals int `json:"away_goals" binding:"min=0"`
}

type SettlePredictionResponse struct {
	Success bool   `json:"success"`
	Result  any    `json:"result,omitempty"`
	Error   string `json:"error,omitempty"`
}

type EngineStatusResponse struct {
	Status    string    `json:"status"`
	Engine    string    `json:"engine"`
	Version   string    `json:"version"`
	Timestamp time.Time `json:"timestamp"`
	DBMode    string    `json:"db_mode"`
}
