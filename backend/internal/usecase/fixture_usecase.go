package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"predifutbol/backend/internal/domain"
	"predifutbol/backend/pkg/formatter"
)

type FixtureUsecase struct {
	repo         domain.FixtureRepository
	httpClient   *http.Client
	rapidAPIKey  string
	rapidAPIHost string
	apiBaseURL   string
}

func NewFixtureUsecase(
	repo domain.FixtureRepository,
	rapidAPIKey string,
	rapidAPIHost string,
	apiBaseURL string,
) *FixtureUsecase {
	if rapidAPIHost == "" {
		rapidAPIHost = "api-football-v1.p.rapidapi.com"
	}
	if apiBaseURL == "" {
		apiBaseURL = "https://api-football-v1.p.rapidapi.com/v3"
	}
	return &FixtureUsecase{
		repo:         repo,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
		rapidAPIKey:  rapidAPIKey,
		rapidAPIHost: rapidAPIHost,
		apiBaseURL:   apiBaseURL,
	}
}

func (u *FixtureUsecase) Search(ctx context.Context, filter domain.FixtureFilter) ([]domain.Fixture, error) {
	fixtures, err := u.repo.Search(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("fixture_usecase/search: %w", err)
	}
	return fixtures, nil
}

type SyncResult struct {
	Fetched  int    `json:"fetched"`
	Saved    int    `json:"saved"`
	Date     string `json:"date"`
	Timezone string `json:"timezone"`
}

type apiFootballFixtureItem struct {
	Fixture struct {
		ID        int64     `json:"id"`
		Referee   *string   `json:"referee"`
		Timezone  string    `json:"timezone"`
		Date      time.Time `json:"date"`
		Timestamp int64     `json:"timestamp"`
		Venue     struct {
			Name *string `json:"name"`
			City *string `json:"city"`
		} `json:"venue"`
		Status struct {
			Long    string `json:"long"`
			Short   string `json:"short"`
			Elapsed *int   `json:"elapsed"`
		} `json:"status"`
	} `json:"fixture"`
	League struct {
		ID      int64  `json:"id"`
		Name    string `json:"name"`
		Country string `json:"country"`
		Logo    string `json:"logo"`
	} `json:"league"`
	Teams struct {
		Home struct {
			ID   int64  `json:"id"`
			Name string `json:"name"`
			Logo string `json:"logo"`
		} `json:"home"`
		Away struct {
			ID   int64  `json:"id"`
			Name string `json:"name"`
			Logo string `json:"logo"`
		} `json:"away"`
	} `json:"teams"`
	Goals struct {
		Home *int `json:"home"`
		Away *int `json:"away"`
	} `json:"goals"`
}

type apiFootballResponse struct {
	Response []apiFootballFixtureItem `json:"response"`
	Errors   any                      `json:"errors"`
}

func (u *FixtureUsecase) SyncByDate(ctx context.Context, dateStr string, timezone string) (*SyncResult, error) {
	if u.rapidAPIKey == "" {
		return nil, fmt.Errorf("%w: RAPIDAPI_KEY is not configured", domain.ErrInvalidInput)
	}
	if timezone == "" {
		timezone = "America/Bogota"
	}
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	endpoint := fmt.Sprintf("%s/fixtures?date=%s&timezone=%s",
		u.apiBaseURL,
		url.QueryEscape(dateStr),
		url.QueryEscape(timezone),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("fixture_usecase/newRequest: %w", err)
	}

	req.Header.Set("X-RapidAPI-Host", u.rapidAPIHost)
	req.Header.Set("X-RapidAPI-Key", u.rapidAPIKey)

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fixture_usecase/doRequest: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: API-Football returned status %d", domain.ErrExternalAPI, resp.StatusCode)
	}

	var apiResp apiFootballResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("fixture_usecase/decode: %w", err)
	}

	converted := make([]domain.Fixture, 0, len(apiResp.Response))
	for _, item := range apiResp.Response {
		f := domain.Fixture{
			ID:            item.Fixture.ID,
			Timezone:      item.Fixture.Timezone,
			Date:          &item.Fixture.Date,
			Timestamp:     item.Fixture.Timestamp,
			Elapsed:       item.Fixture.Status.Elapsed,
			GoalHome:      item.Goals.Home,
			GoalAway:      item.Goals.Away,
			HomeID:        item.Teams.Home.ID,
			HomeName:      item.Teams.Home.Name,
			HomeNameES:    formatter.TranslateTeamName(item.Teams.Home.Name, "es"),
			HomeLogo:      item.Teams.Home.Logo,
			AwayID:        item.Teams.Away.ID,
			AwayName:      item.Teams.Away.Name,
			AwayNameES:    formatter.TranslateTeamName(item.Teams.Away.Name, "es"),
			AwayLogo:      item.Teams.Away.Logo,
			LeagueID:      item.League.ID,
			LeagueName:    item.League.Name,
			LeagueCountry: item.League.Country,
			LeagueLogo:    item.League.Logo,
			StatusShort:   item.Fixture.Status.Short,
			StatusLongEN:  item.Fixture.Status.Long,
		}
		if item.Fixture.Referee != nil {
			f.Referee = *item.Fixture.Referee
		}
		if item.Fixture.Venue.Name != nil {
			f.VenueName = *item.Fixture.Venue.Name
		}
		if item.Fixture.Venue.City != nil {
			f.VenueCity = *item.Fixture.Venue.City
		}
		converted = append(converted, f)
	}

	savedCount, err := u.repo.UpsertBatch(ctx, converted)
	if err != nil {
		return nil, fmt.Errorf("fixture_usecase/upsert: %w", err)
	}

	return &SyncResult{
		Fetched:  len(apiResp.Response),
		Saved:    savedCount,
		Date:     dateStr,
		Timezone: timezone,
	}, nil
}
