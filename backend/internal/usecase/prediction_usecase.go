package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

	"predifutbol/backend/internal/domain"
)

type PredictionUsecase struct {
	repo         domain.PredictionRepository
	fixtureRepo  domain.FixtureRepository
	rapidAPIKey  string
	rapidAPIHost string
	apiBaseURL   string
	httpClient   *http.Client
}

func NewPredictionUsecase(
	repo domain.PredictionRepository,
	fixtureRepo domain.FixtureRepository,
	rapidAPIKey string,
	rapidAPIHost string,
	apiBaseURL string,
) *PredictionUsecase {
	if rapidAPIHost == "" {
		rapidAPIHost = "api-football-v1.p.rapidapi.com"
	}
	if apiBaseURL == "" {
		apiBaseURL = "https://api-football-v1.p.rapidapi.com/v3"
	}
	return &PredictionUsecase{
		repo:         repo,
		fixtureRepo:  fixtureRepo,
		rapidAPIKey:  rapidAPIKey,
		rapidAPIHost: rapidAPIHost,
		apiBaseURL:   apiBaseURL,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
	}
}

func (u *PredictionUsecase) List(ctx context.Context, filter domain.PredictionFilter) (*domain.PredictionListResult, error) {
	res, err := u.repo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("prediction_usecase/list: %w", err)
	}
	return res, nil
}

func (u *PredictionUsecase) FindByID(ctx context.Context, id int64) (*domain.Prediction, error) {
	pred, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("prediction_usecase/findByID: %w", err)
	}
	return pred, nil
}

func (u *PredictionUsecase) Save(ctx context.Context, p *domain.Prediction) (*domain.Prediction, error) {
	if p.HomeName == "" || p.AwayName == "" {
		return nil, fmt.Errorf("%w: home and away names are required", domain.ErrInvalidInput)
	}

	// Enrich picks if missing or generic
	if p.TypePredictionID != nil {
		tID := *p.TypePredictionID
		if p.CustomPickES == "" || IsGenericMarketName(p.CustomPickES) || p.CustomPickEN == "" || IsGenericMarketName(p.CustomPickEN) {
			formatted := FormatMarketPick(tID, p.PredictionValue)
			if p.CustomPickES == "" || IsGenericMarketName(p.CustomPickES) {
				p.CustomPickES = formatted.ES
			}
			if p.CustomPickEN == "" || IsGenericMarketName(p.CustomPickEN) {
				p.CustomPickEN = formatted.EN
			}
		}
	}

	// Generate and attach TikTok metadata
	ttContent := GenerateTikTokContent(p)
	p.TikTokCaption = ttContent.Caption
	p.TikTokHashtags = ttContent.Hashtags
	p.TikTokFullText = ttContent.FullText

	if p.Theme == "" {
		p.Theme = "emerald"
	}
	if p.Probability <= 0 {
		p.Probability = 70
	}
	if p.StakeBet <= 0 {
		p.StakeBet = 7
	}
	if p.Odd <= 0 {
		p.Odd = 1.75
	}
	if p.WasRight == 0 && p.ID == 0 {
		p.WasRight = 2 // default to Pending for new predictions
	}

	saved, err := u.repo.Save(ctx, p)
	if err != nil {
		return nil, fmt.Errorf("prediction_usecase/save: %w", err)
	}
	return saved, nil
}

func (u *PredictionUsecase) Delete(ctx context.Context, id int64) error {
	if err := u.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("prediction_usecase/delete: %w", err)
	}
	return nil
}

type SettleResult struct {
	PredictionID int64  `json:"prediction_id"`
	WasRight     int    `json:"was_right"` // 1: Won, 0: Lost, 2: Void
	HomeGoals    int    `json:"home_goals"`
	AwayGoals    int    `json:"away_goals"`
	Status       string `json:"status"`
}

func (u *PredictionUsecase) Settle(ctx context.Context, id int64, homeGoals, awayGoals int) (*SettleResult, error) {
	pred, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("prediction_usecase/settleFind: %w", err)
	}

	resultStatus := EvaluatePredictionRules(pred, homeGoals, awayGoals)
	pred.WasRight = resultStatus

	if _, err := u.repo.Save(ctx, pred); err != nil {
		return nil, fmt.Errorf("prediction_usecase/settleSave: %w", err)
	}

	statusStr := "LOST"
	if resultStatus == 1 {
		statusStr = "WON"
	}

	return &SettleResult{
		PredictionID: id,
		WasRight:     resultStatus,
		HomeGoals:    homeGoals,
		AwayGoals:    awayGoals,
		Status:       statusStr,
	}, nil
}

func (u *PredictionUsecase) fetchApiFixture(ctx context.Context, fixtureID int64) (*apiFootballFixtureItem, error) {
	if u.rapidAPIKey == "" || fixtureID <= 0 {
		return nil, nil
	}

	endpoint := fmt.Sprintf("%s/fixtures?id=%d", u.apiBaseURL, fixtureID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("prediction_usecase/fetchApiFixtureReq: %w", err)
	}

	req.Header.Set("x-rapidapi-host", u.rapidAPIHost)
	req.Header.Set("x-rapidapi-key", u.rapidAPIKey)

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("prediction_usecase/fetchApiFixtureDo: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("prediction_usecase/fetchApiFixtureStatus: %d", resp.StatusCode)
	}

	var apiResp struct {
		Response []apiFootballFixtureItem `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("prediction_usecase/fetchApiFixtureDecode: %w", err)
	}

	if len(apiResp.Response) == 0 {
		return nil, nil
	}
	return &apiResp.Response[0], nil
}

func (u *PredictionUsecase) CheckAllPending(ctx context.Context) (*domain.CheckAllResult, error) {
	pending, err := u.repo.GetPending(ctx)
	if err != nil {
		return nil, fmt.Errorf("prediction_usecase/checkAllPending: %w", err)
	}

	summary := &domain.CheckAllResult{
		TotalPending: len(pending),
		Results:      make([]domain.CheckItemResult, 0, len(pending)),
	}

	for _, pred := range pending {
		var homeGoals, awayGoals *int
		isFinished := false
		source := ""

		// 1. If fixture_id exists and rapidAPIKey is configured, query API-Football
		if pred.FixtureID != nil && *pred.FixtureID > 0 && u.rapidAPIKey != "" {
			apiFixture, err := u.fetchApiFixture(ctx, *pred.FixtureID)
			if err == nil && apiFixture != nil {
				statusShort := apiFixture.Fixture.Status.Short
				if (statusShort == "FT" || statusShort == "AET" || statusShort == "PEN") &&
					apiFixture.Goals.Home != nil && apiFixture.Goals.Away != nil {
					homeGoals = apiFixture.Goals.Home
					awayGoals = apiFixture.Goals.Away
					isFinished = true
					source = "API-Football (Tiempo Real)"

					// Synchronize fixture score to local repository
					if u.fixtureRepo != nil {
						_ = u.fixtureRepo.UpdateScore(ctx, *pred.FixtureID, *homeGoals, *awayGoals, statusShort)
					}
				}
			}
		}

		// 2. If not finished via API, check local fixture in DB
		if !isFinished && pred.FixtureID != nil && *pred.FixtureID > 0 && u.fixtureRepo != nil {
			dbFix, err := u.fixtureRepo.FindByID(ctx, *pred.FixtureID)
			if err == nil && dbFix != nil && dbFix.GoalHome != nil && dbFix.GoalAway != nil {
				homeGoals = dbFix.GoalHome
				awayGoals = dbFix.GoalAway
				isFinished = true
				source = "Base de Datos Local"
			}
		}

		pickText := pred.CustomPickES
		if pickText == "" {
			pickText = pred.CustomPickEN
		}
		if pickText == "" {
			pickText = pred.PredictionValue
		}

		if isFinished && homeGoals != nil && awayGoals != nil {
			wasRight := EvaluatePredictionRules(&pred, *homeGoals, *awayGoals)
			pred.WasRight = wasRight
			_, _ = u.repo.Save(ctx, &pred)

			summary.Settled++
			outcomeStr := "Fallada"
			if wasRight == 1 {
				summary.Won++
				outcomeStr = "Acertada"
			} else {
				summary.Lost++
			}

			summary.Results = append(summary.Results, domain.CheckItemResult{
				ID:       pred.ID,
				HomeName: pred.HomeName,
				AwayName: pred.AwayName,
				Score:    fmt.Sprintf("%d - %d", *homeGoals, *awayGoals),
				Pick:     pickText,
				WasRight: wasRight,
				Outcome:  outcomeStr,
				Source:   source,
			})
		} else {
			summary.StillPending++
			reason := "Predicción sin fixture vinculado"
			if pred.FixtureID != nil && *pred.FixtureID > 0 {
				reason = "El partido aún no ha finalizado o no tiene marcador registrado"
			}
			summary.Results = append(summary.Results, domain.CheckItemResult{
				ID:       pred.ID,
				HomeName: pred.HomeName,
				AwayName: pred.AwayName,
				Pick:     pickText,
				WasRight: 2,
				Outcome:  "Pendiente",
				Reason:   reason,
			})
		}
	}

	if summary.Settled > 0 {
		summary.WinRate = math.Round((float64(summary.Won)/float64(summary.Settled)*100.0)*10) / 10
	}

	return summary, nil
}
