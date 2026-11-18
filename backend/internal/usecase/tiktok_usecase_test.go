package usecase_test

import (
	"strings"
	"testing"

	"predifutbol/backend/internal/domain"
	"predifutbol/backend/internal/usecase"
)

func TestGenerateTikTokContent(t *testing.T) {
	pred := &domain.Prediction{
		HomeName:     "Junior",
		AwayName:     "Cucuta",
		LeagueName:   "Liga BetPlay Colombia",
		Stadium:      "Estadio Metropolitano",
		CustomPickES: "Gana Local",
		Odd:          1.80,
		Probability:  75,
		StatsES: []string{
			"Junior invicto en casa",
			"Cucuta no ha ganado de visita",
		},
	}

	result := usecase.GenerateTikTokContent(pred)

	if !strings.Contains(result.Caption, "LIGA BETPLAY COLOMBIA") {
		t.Errorf("expected caption to contain league header")
	}
	if !strings.Contains(result.Caption, "Junior vs Cucuta") {
		t.Errorf("expected caption to contain match title")
	}
	if !strings.Contains(result.Caption, "Gana Local") {
		t.Errorf("expected caption to contain pick")
	}
	if !strings.Contains(result.Hashtags, "#JuniorvsCucuta") {
		t.Errorf("expected hashtags to contain match tag, got: %s", result.Hashtags)
	}
	if !strings.Contains(result.Hashtags, "#PrediFutbol") {
		t.Errorf("expected hashtags to contain brand tag")
	}
}
