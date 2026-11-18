package audio_test

import (
	"strings"
	"testing"

	"predifutbol/backend/internal/domain"
	"predifutbol/backend/pkg/audio"
)

func TestCleanForSpeech(t *testing.T) {
	input := "⚡ H2H: Invicto 🔥 ¡Partidazo! ⚽ #PrediFutbol"
	cleaned := audio.CleanForSpeech(input)

	if strings.Contains(cleaned, "⚡") || strings.Contains(cleaned, "🔥") || strings.Contains(cleaned, "⚽") || strings.Contains(cleaned, "#") {
		t.Errorf("CleanForSpeech failed to remove special characters: %s", cleaned)
	}
	if !strings.Contains(cleaned, "Invicto") {
		t.Errorf("expected cleaned string to contain 'Invicto', got: %s", cleaned)
	}
}

func TestBuildNarrationText(t *testing.T) {
	svc := audio.NewAudioService("", "")
	type1 := 1

	pred := &domain.Prediction{
		HomeName:         "Liverpool",
		AwayName:         "Arsenal",
		TypePredictionID: &type1,
		PredictionValue:  "1",
		CustomPickES:     "Gana Local",
		CustomPickEN:     "Home Win",
		Odd:              1.85,
		Probability:      72,
	}

	textES := svc.BuildNarrationText(pred, "es")
	if !strings.Contains(textES, "Liverpool recibe a Arsenal") {
		t.Errorf("expected Spanish text to have match intro, got: %s", textES)
	}
	if !strings.Contains(textES, "Gana Local") {
		t.Errorf("expected Spanish text to have pick, got: %s", textES)
	}
	if !strings.Contains(textES, "1 punto 85") {
		t.Errorf("expected Spanish text to have spoken odd, got: %s", textES)
	}

	textEN := svc.BuildNarrationText(pred, "en")
	if !strings.Contains(textEN, "Liverpool takes on Arsenal") {
		t.Errorf("expected English text to have match intro, got: %s", textEN)
	}
	if !strings.Contains(textEN, "Home Win") {
		t.Errorf("expected English text to have pick, got: %s", textEN)
	}
	if !strings.Contains(textEN, "1 point 85") {
		t.Errorf("expected English text to have spoken odd, got: %s", textEN)
	}
}
