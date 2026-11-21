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
	if !strings.Contains(textES, "uno punto ochenta y cinco") {
		t.Errorf("expected Spanish text to have spoken odd, got: %s", textES)
	}

	textEN := svc.BuildNarrationText(pred, "en")
	if !strings.Contains(textEN, "Liverpool takes on Arsenal") {
		t.Errorf("expected English text to have match intro, got: %s", textEN)
	}
	if !strings.Contains(textEN, "Home Win") {
		t.Errorf("expected English text to have pick, got: %s", textEN)
	}
	if !strings.Contains(textEN, "one point eighty-five") {
		t.Errorf("expected English text to have spoken odd, got: %s", textEN)
	}
}

func TestFormatPickForSpeech(t *testing.T) {
	tests := []struct {
		input    string
		lang     string
		expected string
	}{
		{"Más de 6 5 tarjetas", "es", "Más de seis punto cinco tarjetas"},
		{"Más de 6.5 tarjetas", "es", "Más de seis punto cinco tarjetas"},
		{"Más de 2.5 Goles", "es", "Más de dos punto cinco Goles"},
		{"Menos de 3.5 Córners", "es", "Menos de tres punto cinco Córners"},
		{"Over 2.5 Goals", "en", "Over two point five Goals"},
		{"Over 6 5 Cards", "en", "Over six point five Cards"},
	}

	for _, tt := range tests {
		actual := audio.FormatPickForSpeech(tt.input, tt.lang)
		if actual != tt.expected {
			t.Errorf("FormatPickForSpeech(%q, %q) = %q; want %q", tt.input, tt.lang, actual, tt.expected)
		}
	}
}

func TestFormatOddForSpeech(t *testing.T) {
	tests := []struct {
		odd      float64
		lang     string
		expected string
	}{
		{1.90, "es", "uno punto noventa"},
		{1.85, "es", "uno punto ochenta y cinco"},
		{2.10, "es", "dos punto diez"},
		{1.90, "en", "one point ninety"},
		{2.00, "es", "dos"},
		{2.05, "es", "dos punto cero cinco"},
	}

	for _, tt := range tests {
		actual := audio.FormatOddForSpeech(tt.odd, tt.lang)
		if actual != tt.expected {
			t.Errorf("FormatOddForSpeech(%.2f, %q) = %q; want %q", tt.odd, tt.lang, actual, tt.expected)
		}
	}
}
