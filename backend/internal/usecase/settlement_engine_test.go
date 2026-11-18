package usecase_test

import (
	"testing"

	"predifutbol/backend/internal/domain"
	"predifutbol/backend/internal/usecase"
)

func TestEvaluatePredictionRules(t *testing.T) {
	type1 := 1
	type2 := 2
	type3 := 3
	type4 := 4
	type9 := 9

	tests := []struct {
		name      string
		pred      domain.Prediction
		homeGoals int
		awayGoals int
		expected  int // 1: Won, 0: Lost
	}{
		{
			name:      "1X2 Pick 1 with Home Win",
			pred:      domain.Prediction{TypePredictionID: &type1, PredictionValue: "1"},
			homeGoals: 2, awayGoals: 0,
			expected: 1,
		},
		{
			name:      "1X2 Pick 1 with Draw",
			pred:      domain.Prediction{TypePredictionID: &type1, PredictionValue: "1"},
			homeGoals: 1, awayGoals: 1,
			expected: 0,
		},
		{
			name:      "Double Chance 1X with Draw",
			pred:      domain.Prediction{TypePredictionID: &type1, PredictionValue: "1X"},
			homeGoals: 1, awayGoals: 1,
			expected: 1,
		},
		{
			name:      "Double Chance X2 with Away Win",
			pred:      domain.Prediction{TypePredictionID: &type1, PredictionValue: "X2"},
			homeGoals: 0, awayGoals: 1,
			expected: 1,
		},
		{
			name:      "Correct Score 2-1 with exact match",
			pred:      domain.Prediction{TypePredictionID: &type2, PredictionValue: "2-1"},
			homeGoals: 2, awayGoals: 1,
			expected: 1,
		},
		{
			name:      "Correct Score 2-1 with 1-1",
			pred:      domain.Prediction{TypePredictionID: &type2, PredictionValue: "2-1"},
			homeGoals: 1, awayGoals: 1,
			expected: 0,
		},
		{
			name:      "Over 2.5 with 3 goals total",
			pred:      domain.Prediction{TypePredictionID: &type3, PredictionValue: "2.5"},
			homeGoals: 2, awayGoals: 1,
			expected: 1,
		},
		{
			name:      "Over 2.5 with 2 goals total",
			pred:      domain.Prediction{TypePredictionID: &type3, PredictionValue: "2.5"},
			homeGoals: 1, awayGoals: 1,
			expected: 0,
		},
		{
			name:      "Under 2.5 with 1 goal total",
			pred:      domain.Prediction{TypePredictionID: &type4, PredictionValue: "2.5"},
			homeGoals: 1, awayGoals: 0,
			expected: 1,
		},
		{
			name:      "BTTS YES with both teams scoring",
			pred:      domain.Prediction{TypePredictionID: &type9, PredictionValue: "YES"},
			homeGoals: 1, awayGoals: 1,
			expected: 1,
		},
		{
			name:      "BTTS YES with clean sheet",
			pred:      domain.Prediction{TypePredictionID: &type9, PredictionValue: "YES"},
			homeGoals: 2, awayGoals: 0,
			expected: 0,
		},
		{
			name:      "BTTS NO with clean sheet",
			pred:      domain.Prediction{TypePredictionID: &type9, PredictionValue: "NO"},
			homeGoals: 2, awayGoals: 0,
			expected: 1,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := usecase.EvaluatePredictionRules(&tc.pred, tc.homeGoals, tc.awayGoals)
			if result != tc.expected {
				t.Errorf("expected %d, got %d", tc.expected, result)
			}
		})
	}
}
