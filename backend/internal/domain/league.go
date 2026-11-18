package domain

import "context"

type Country struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Code string `json:"code,omitempty"`
	Flag string `json:"flag,omitempty"`
}

type League struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Type        string  `json:"type,omitempty"`
	Logo        string  `json:"logo,omitempty"`
	CountryID   *int64  `json:"country_id,omitempty"`
	CountryName string  `json:"country_name,omitempty"`
	CountryCode string  `json:"country_code,omitempty"`
	CountryFlag string  `json:"country_flag,omitempty"`
}

type LeagueRepository interface {
	Search(ctx context.Context, query string, limit int) ([]League, error)
	FindByID(ctx context.Context, id int64) (*League, error)
}
