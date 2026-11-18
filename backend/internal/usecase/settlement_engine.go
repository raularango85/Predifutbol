package usecase

import (
	"strconv"
	"strings"

	"predifutbol/backend/internal/domain"
)

// EvaluatePredictionRules evaluates whether a prediction was WON (1) or LOST (0).
// Returns 1 for WON, 0 for LOST.
func EvaluatePredictionRules(p *domain.Prediction, homeGoals, awayGoals int) int {
	typeID := 1
	if p.TypePredictionID != nil {
		typeID = *p.TypePredictionID
	}
	val := strings.TrimSpace(p.PredictionValue)
	totalGoals := homeGoals + awayGoals

	// 1. Classic (1X2 / Double Chance)
	if typeID == 1 || typeID == 17 || typeID == 18 {
		outcome := 0 // 1: Local, 2: Away, 3: Draw
		if homeGoals > awayGoals {
			outcome = 1
		} else if homeGoals < awayGoals {
			outcome = 2
		} else {
			outcome = 3
		}

		if val == "1" && outcome == 1 {
			return 1
		}
		if val == "1X" && (outcome == 1 || outcome == 3) {
			return 1
		}
		if val == "2" && outcome == 2 {
			return 1
		}
		if val == "X2" && (outcome == 2 || outcome == 3) {
			return 1
		}
		if val == "12" && (outcome == 1 || outcome == 2) {
			return 1
		}
		if val == "X" && outcome == 3 {
			return 1
		}
		return 0
	}

	// 2. Correct Score (e.g. "2-1")
	if typeID == 2 {
		parts := strings.FieldsFunc(val, func(r rune) bool {
			return r == '-' || r == ':'
		})
		if len(parts) >= 2 {
			predHome, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
			predAway, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
			if err1 == nil && err2 == nil {
				if homeGoals == predHome && awayGoals == predAway {
					return 1
				}
			}
		}
		return 0
	}

	// 3. Match Over Goals
	if typeID == 3 || typeID == 19 {
		threshold, err := strconv.ParseFloat(val, 64)
		if err == nil && float64(totalGoals) > threshold {
			return 1
		}
		return 0
	}

	// 4. Match Under Goals
	if typeID == 4 || typeID == 20 {
		threshold, err := strconv.ParseFloat(val, 64)
		if err == nil && float64(totalGoals) < threshold {
			return 1
		}
		return 0
	}

	// 5. Home Team Over Goals
	if typeID == 5 {
		threshold, err := strconv.ParseFloat(val, 64)
		if err == nil && float64(homeGoals) > threshold {
			return 1
		}
		return 0
	}

	// 6. Home Team Under Goals
	if typeID == 6 {
		threshold, err := strconv.ParseFloat(val, 64)
		if err == nil && float64(homeGoals) < threshold {
			return 1
		}
		return 0
	}

	// 7. Away Team Under Goals
	if typeID == 7 {
		threshold, err := strconv.ParseFloat(val, 64)
		if err == nil && float64(awayGoals) < threshold {
			return 1
		}
		return 0
	}

	// 8. Away Team Over Goals
	if typeID == 8 {
		threshold, err := strconv.ParseFloat(val, 64)
		if err == nil && float64(awayGoals) > threshold {
			return 1
		}
		return 0
	}

	// 9. Both Teams To Score (BTTS)
	if typeID == 9 {
		bttsHappened := homeGoals > 0 && awayGoals > 0
		valUpper := strings.ToUpper(val)
		isYesPick := valUpper == "YES" || valUpper == "SI" || valUpper == "SÍ" || valUpper == "1"
		if isYesPick && bttsHappened {
			return 1
		}
		if !isYesPick && !bttsHappened {
			return 1
		}
		return 0
	}

	return 0
}
