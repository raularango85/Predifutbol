package domain

import "context"

type Venue struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Address  string `json:"address,omitempty"`
	City     string `json:"city,omitempty"`
	Capacity int    `json:"capacity,omitempty"`
	Surface  string `json:"surface,omitempty"`
	Image    string `json:"image,omitempty"`
}

type Team struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Country     string  `json:"country,omitempty"`
	Founded     *int    `json:"founded,omitempty"`
	National    int     `json:"national,omitempty"`
	Logo        string  `json:"logo,omitempty"`
	CountryID   *int64  `json:"country_id,omitempty"`
	VenueID     *int64  `json:"venue_id,omitempty"`
	VenueName   string  `json:"venue_name,omitempty"`
	VenueCity   string  `json:"venue_city,omitempty"`
	Flag        string  `json:"flag,omitempty"`
}

type TeamRepository interface {
	Search(ctx context.Context, query string, limit int) ([]Team, error)
	FindByID(ctx context.Context, id int64) (*Team, error)
}
