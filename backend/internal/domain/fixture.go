package domain

import (
	"context"
	"time"
)

type Fixture struct {
	ID            int64      `json:"id"`
	Referee       string     `json:"referee,omitempty"`
	Timezone      string     `json:"timezone,omitempty"`
	Date          *time.Time `json:"date,omitempty"`
	Timestamp     int64      `json:"timestamp,omitempty"`
	Elapsed       *int       `json:"elapsed,omitempty"`
	VenueName     string     `json:"venue_name,omitempty"`
	VenueCity     string     `json:"venue_city,omitempty"`
	GoalHome      *int       `json:"goal_home,omitempty"`
	GoalAway      *int       `json:"goal_away,omitempty"`
	HomeID        int64      `json:"home_id"`
	HomeName      string     `json:"home_name"`
	HomeNameES    string     `json:"home_name_es,omitempty"`
	HomeLogo      string     `json:"home_logo,omitempty"`
	AwayID        int64      `json:"away_id"`
	AwayName      string     `json:"away_name"`
	AwayNameES    string     `json:"away_name_es,omitempty"`
	AwayLogo      string     `json:"away_logo,omitempty"`
	LeagueID      int64      `json:"league_id"`
	LeagueName    string     `json:"league_name"`
	LeagueCountry string     `json:"league_country,omitempty"`
	LeagueLogo    string     `json:"league_logo,omitempty"`
	StatusShort   string     `json:"status_short,omitempty"`
	StatusLongES  string     `json:"status_long_es,omitempty"`
	StatusLongEN  string     `json:"status_long_en,omitempty"`
}

type FixtureFilter struct {
	Query        string
	Date         string
	UpcomingOnly bool
	Limit        int
}

type FixtureRepository interface {
	Search(ctx context.Context, filter FixtureFilter) ([]Fixture, error)
	UpsertBatch(ctx context.Context, fixtures []Fixture) (int, error)
	FindByID(ctx context.Context, id int64) (*Fixture, error)
	UpdateScore(ctx context.Context, fixtureID int64, goalHome, goalAway int, statusShort string) error
}
