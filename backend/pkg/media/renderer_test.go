package media_test

import (
	"context"
	"strings"
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

func TestResolveImageToDataURL(t *testing.T) {
	ctx := context.Background()

	// 1. Data URI remains as-is
	dataURI := "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA"
	if res := media.ResolveImageToDataURL(ctx, dataURI, "."); res != dataURI {
		t.Errorf("expected dataURI to return unchanged, got %s", res)
	}

	// 2. Empty string returns empty
	if res := media.ResolveImageToDataURL(ctx, "", "."); res != "" {
		t.Errorf("expected empty string to return empty, got %s", res)
	}

	// 3. Local logo in public/logo_big_512_512.png
	resLogo := media.ResolveImageToDataURL(ctx, "/public/logo_big_512_512.png", "../../..")
	if !strings.HasPrefix(resLogo, "data:image/png;base64,") {
		t.Errorf("expected logo to resolve to base64 data URL, got %s", resLogo[:min(len(resLogo), 30)])
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
