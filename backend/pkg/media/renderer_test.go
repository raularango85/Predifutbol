package media_test

import (
	"testing"

	"predifutbol/backend/pkg/media"
)

func TestSanitizeSlug(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Atlético Nacional", "ATL_TICO_NACIONAL"},
		{"Real Madrid C.F.", "REAL_MADRID_C_F"},
		{"", "MATCH"},
		{"   Liverpool   ", "LIVERPOOL"},
	}

	for _, tc := range tests {
		got := media.SanitizeSlug(tc.input)
		if got != tc.expected {
			t.Errorf("SanitizeSlug(%q) = %q, expected %q", tc.input, got, tc.expected)
		}
	}
}
