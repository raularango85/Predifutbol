package audio

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"predifutbol/backend/internal/domain"
	"predifutbol/backend/pkg/formatter"
)

type AudioService struct {
	ffmpegPath     string
	publicAudioDir string
}

func NewAudioService(ffmpegPath, publicAudioDir string) *AudioService {
	// Auto-detect ffmpeg if empty
	if ffmpegPath == "" {
		if path, err := exec.LookPath("ffmpeg"); err == nil {
			ffmpegPath = path
		} else {
			// Check node_modules fallback
			candidate := filepath.Join("..", "node_modules", "ffmpeg-static", "ffmpeg.exe")
			if _, err := os.Stat(candidate); err == nil {
				ffmpegPath = candidate
			}
		}
	}
	return &AudioService{
		ffmpegPath:     ffmpegPath,
		publicAudioDir: publicAudioDir,
	}
}

var emojiRegex = regexp.MustCompile(`[\x{1F300}-\x{1F9FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}•|#⚡🔥🛡️⚽🔔📢🎯]`)
var spacesRegex = regexp.MustCompile(`\s+`)
var spaceDecimalRegex = regexp.MustCompile(`(?i)\b(m[aá]s\s+de|menos\s+de|over|under)\s+(\d+)\s+(\d+)\b`)
var decimalRegex = regexp.MustCompile(`\b(\d+)[.,](\d+)\b`)

var unitsES = map[int]string{
	0: "cero", 1: "uno", 2: "dos", 3: "tres", 4: "cuatro",
	5: "cinco", 6: "seis", 7: "siete", 8: "ocho", 9: "nueve",
	10: "diez", 11: "once", 12: "doce", 13: "trece", 14: "catorce",
	15: "quince", 16: "dieciséis", 17: "diecisiete", 18: "dieciocho", 19: "diecinueve",
	20: "veinte", 21: "veintiuno", 22: "veintidós", 23: "veintitrés", 24: "veinticuatro",
	25: "veinticinco", 26: "veintiséis", 27: "veintisiete", 28: "veintiocho", 29: "veintinueve",
}

var tensES = map[int]string{
	30: "treinta", 40: "cuarenta", 50: "cincuenta", 60: "sesenta",
	70: "setenta", 80: "ochenta", 90: "noventa",
}

var unitsEN = map[int]string{
	0: "zero", 1: "one", 2: "two", 3: "three", 4: "four",
	5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine",
	10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen",
	15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen",
	20: "twenty",
}

var tensEN = map[int]string{
	30: "thirty", 40: "forty", 50: "fifty", 60: "sixty",
	70: "seventy", 80: "eighty", 90: "ninety",
}

func NumberToWords(n int, lang string) string {
	if lang == "es" {
		if n < 0 {
			return fmt.Sprintf("menos %s", NumberToWords(-n, lang))
		}
		if str, ok := unitsES[n]; ok {
			return str
		}
		if n < 100 {
			ten := (n / 10) * 10
			unit := n % 10
			if unit == 0 {
				return tensES[ten]
			}
			return fmt.Sprintf("%s y %s", tensES[ten], unitsES[unit])
		}
		return fmt.Sprintf("%d", n)
	}

	// English
	if n < 0 {
		return fmt.Sprintf("minus %s", NumberToWords(-n, lang))
	}
	if str, ok := unitsEN[n]; ok {
		return str
	}
	if n < 100 {
		ten := (n / 10) * 10
		unit := n % 10
		if unit == 0 {
			return tensEN[ten]
		}
		return fmt.Sprintf("%s-%s", tensEN[ten], unitsEN[unit])
	}
	return fmt.Sprintf("%d", n)
}

func FormatOddForSpeech(odd float64, lang string) string {
	if odd <= 0 {
		odd = 1.75
	}
	if lang == "es" {
		intPart := int(odd)
		decPart := int(math.Round((odd - float64(intPart)) * 100))
		intStr := NumberToWords(intPart, "es")
		decStr := NumberToWords(decPart, "es")
		if decPart < 10 && decPart > 0 {
			decStr = fmt.Sprintf("cero %s", unitsES[decPart])
		} else if decPart == 0 {
			return intStr
		}
		return fmt.Sprintf("%s punto %s", intStr, decStr)
	}

	intPart := int(odd)
	decPart := int(math.Round((odd - float64(intPart)) * 100))
	intStr := NumberToWords(intPart, "en")
	decStr := NumberToWords(decPart, "en")
	if decPart == 0 {
		return intStr
	}
	return fmt.Sprintf("%s point %s", intStr, decStr)
}

func FormatPickForSpeech(pick string, lang string) string {
	cleaned := CleanForSpeech(pick)
	if cleaned == "" {
		return cleaned
	}

	isEs := lang == "es"

	// 1. Handle space-separated decimals in betting lines, e.g. "Más de 6 5 tarjetas" -> "Más de seis punto cinco tarjetas"
	cleaned = spaceDecimalRegex.ReplaceAllStringFunc(cleaned, func(match string) string {
		parts := spaceDecimalRegex.FindStringSubmatch(match)
		if len(parts) == 4 {
			prefix := parts[1]
			d1, err1 := strconv.Atoi(parts[2])
			d2, err2 := strconv.Atoi(parts[3])
			if err1 == nil && err2 == nil {
				if isEs {
					return fmt.Sprintf("%s %s punto %s", prefix, NumberToWords(d1, "es"), NumberToWords(d2, "es"))
				}
				return fmt.Sprintf("%s %s point %s", prefix, NumberToWords(d1, "en"), NumberToWords(d2, "en"))
			}
		}
		return match
	})

	// 2. Handle standard decimals e.g. "6.5", "6,5", "2.5" -> "seis punto cinco", "dos punto cinco"
	cleaned = decimalRegex.ReplaceAllStringFunc(cleaned, func(match string) string {
		parts := decimalRegex.FindStringSubmatch(match)
		if len(parts) == 3 {
			d1, err1 := strconv.Atoi(parts[1])
			d2, err2 := strconv.Atoi(parts[2])
			if err1 == nil && err2 == nil {
				if isEs {
					return fmt.Sprintf("%s punto %s", NumberToWords(d1, "es"), NumberToWords(d2, "es"))
				}
				return fmt.Sprintf("%s point %s", NumberToWords(d1, "en"), NumberToWords(d2, "en"))
			}
		}
		return match
	})

	return cleaned
}

func CleanForSpeech(str string) string {
	clean := emojiRegex.ReplaceAllString(str, "")
	clean = spacesRegex.ReplaceAllString(clean, " ")
	return strings.TrimSpace(clean)
}

func (s *AudioService) BuildNarrationText(p *domain.Prediction, lang string) string {
	isEs := lang == "es"
	rawHome := p.HomeName
	if rawHome == "" {
		rawHome = "Local"
	}
	rawAway := p.AwayName
	if rawAway == "" {
		rawAway = "Visitante"
	}

	home := CleanForSpeech(formatter.TranslateTeamName(rawHome, lang))
	away := CleanForSpeech(formatter.TranslateTeamName(rawAway, lang))

	rawPick := p.CustomPickES
	if !isEs {
		rawPick = p.CustomPickEN
	}
	if rawPick == "" || formatter.IsGenericMarketName(rawPick) {
		tID := 1
		if p.TypePredictionID != nil {
			tID = *p.TypePredictionID
		}
		formatted := formatter.FormatMarketPick(tID, p.PredictionValue)
		if isEs {
			rawPick = formatted.ES
		} else {
			rawPick = formatted.EN
		}
	}
	pick := FormatPickForSpeech(rawPick, lang)
	if pick == "" {
		if isEs {
			pick = "Victoria Local"
		} else {
			pick = "Home Win"
		}
	}

	oddStr := FormatOddForSpeech(p.Odd, lang)

	prob := p.Probability
	if prob <= 0 {
		prob = 70
	}

	if isEs {
		return fmt.Sprintf(
			"¡%s recibe a %s! Nuestra predicción de valor: %s, a cuota %s, con %d por ciento de probabilidad. ¡Síguenos en TikTok! ¡Somos PrediFutbol Colombia!",
			home, away, pick, oddStr, prob,
		)
	}

	return fmt.Sprintf(
		"¡%s takes on %s! Our top value pick: %s, at odds %s, with %d percent confidence. Follow us on TikTok! We are PrediFutbol Colombia!",
		home, away, pick, oddStr, prob,
	)
}

func (s *AudioService) GenerateSpeech(ctx context.Context, text, lang, voice, outputPath string) error {
	primaryVoice := voice
	var fallbackVoices []string

	if lang == "es" {
		if primaryVoice == "" {
			primaryVoice = "es-CO-GonzaloNeural"
		}
		fallbackVoices = []string{"es-CO-SalomeNeural", "es-MX-JorgeNeural"}
	} else {
		if primaryVoice == "" {
			primaryVoice = "en-US-ChristopherNeural"
		}
		fallbackVoices = []string{"en-US-EricNeural", "en-GB-RyanNeural"}
	}

	voicesToTry := append([]string{primaryVoice}, fallbackVoices...)
	rate := "+10%"

	var lastErr error
	for _, v := range voicesToTry {
		for attempt := 1; attempt <= 2; attempt++ {
			_ = os.Remove(outputPath)

			cmd := exec.CommandContext(ctx, "python",
				"-m", "edge_tts",
				"--voice", v,
				"--rate", rate,
				"--text", text,
				"--write-media", outputPath,
			)
			cmd.Env = append(os.Environ(), "PYTHONUTF8=1", "PYTHONIOENCODING=utf-8")
			var stderr bytes.Buffer
			cmd.Stderr = &stderr

			if err := cmd.Run(); err == nil {
				if info, statErr := os.Stat(outputPath); statErr == nil && info.Size() > 1024 {
					return nil
				}
			} else {
				lastErr = fmt.Errorf("%w: %s", err, strings.TrimSpace(stderr.String()))
				slog.Warn("TTS generation attempt failed", slog.String("voice", v), slog.Int("attempt", attempt), slog.String("error", lastErr.Error()))
			}

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(300 * time.Millisecond):
			}
		}
	}

	return fmt.Errorf("audio/generateSpeech failed for all voices: %w", lastErr)
}

func (s *AudioService) MixVideoAudioTrack(ctx context.Context, p *domain.Prediction, lang string, durationSec float64, outputPath string) (bool, error) {
	if s.ffmpegPath == "" {
		return false, fmt.Errorf("ffmpeg binary not available")
	}

	tempNarration := filepath.Join(os.TempDir(), fmt.Sprintf("predifutbol_tts_%d.mp3", time.Now().UnixNano()))
	defer os.Remove(tempNarration)

	text := s.BuildNarrationText(p, lang)
	hasVoice := false
	if err := s.GenerateSpeech(ctx, text, lang, "", tempNarration); err == nil {
		hasVoice = true
	} else {
		slog.Error("TTS GenerateSpeech failed; falling back to BGM only", slog.String("error", err.Error()), slog.String("text", text))
	}

	bgmCrowd := filepath.Join(s.publicAudioDir, "bgm_stadium_crowd.mp3")
	bgmBeat := filepath.Join(s.publicAudioDir, "bgm_sport_beat.mp3")
	sfxWhoosh := filepath.Join(s.publicAudioDir, "sfx_whoosh.mp3")
	sfxDing := filepath.Join(s.publicAudioDir, "sfx_ding.mp3")

	bgmSource := bgmCrowd
	if _, err := os.Stat(bgmSource); err != nil {
		bgmSource = bgmBeat
	}

	isCrowd := bgmSource == bgmCrowd
	fadeStart := durationSec - 1.2
	if fadeStart < 1 {
		fadeStart = 1
	}

	var bgmFilter string
	if isCrowd {
		bgmFilter = fmt.Sprintf("volume='if(between(t,0.4,12.8), 0.12, 0.38)':eval=frame,afade=t=out:st=%.1f:d=1.2[bg]", fadeStart)
	} else {
		bgmFilter = fmt.Sprintf("volume=0.30,afade=t=out:st=%.1f:d=1.2[bg]", fadeStart)
	}

	args := []string{"-y"}
	if hasVoice {
		// [0:a] Narration at t=0.4s
		// [1:a] Background music/crowd with ducking
		// [2:a] Whoosh at t=0s
		// [3:a] Ding at t=5.5s
		filterComplex := fmt.Sprintf(
			"[0:a]adelay=200|200,volume=2.6[vox];"+
				"[1:a]%s;"+
				"[2:a]volume=0.9[whoosh];"+
				"[3:a]adelay=5500|5500,volume=1.4[ding];"+
				"[vox][bg][whoosh][ding]amix=inputs=4:duration=first:normalize=0,loudnorm=I=-14:LRA=7:TP=-1.0[aout]",
			bgmFilter,
		)
		args = append(args,
			"-i", tempNarration,
			"-i", bgmSource,
			"-i", sfxWhoosh,
			"-i", sfxDing,
			"-filter_complex", filterComplex,
			"-map", "[aout]",
			"-t", strconv.FormatFloat(durationSec, 'f', 1, 64),
			"-b:a", "192k",
			outputPath,
		)
	} else {
		// Fallback without narration: BGM + Whoosh + Ding
		filterComplex := fmt.Sprintf(
			"[0:a]volume=0.40,afade=t=out:st=%.1f:d=1.2[bg];"+
				"[1:a]volume=0.9[whoosh];"+
				"[2:a]adelay=5500|5500,volume=1.4[ding];"+
				"[bg][whoosh][ding]amix=inputs=3:duration=first:normalize=0[aout]",
			fadeStart,
		)
		args = append(args,
			"-i", bgmSource,
			"-i", sfxWhoosh,
			"-i", sfxDing,
			"-filter_complex", filterComplex,
			"-map", "[aout]",
			"-t", strconv.FormatFloat(durationSec, 'f', 1, 64),
			"-b:a", "192k",
			outputPath,
		)
	}

	cmd := exec.CommandContext(ctx, s.ffmpegPath, args...)
	if out, err := cmd.CombinedOutput(); err != nil {
		return false, fmt.Errorf("audio/mixFFmpeg: %w (output: %s)", err, string(out))
	}

	return true, nil
}

func (s *AudioService) MuxVideoAndAudio(ctx context.Context, videoPath, audioPath, outputPath string) error {
	if s.ffmpegPath == "" {
		return fmt.Errorf("ffmpeg binary not available")
	}

	cmd := exec.CommandContext(ctx, s.ffmpegPath,
		"-y",
		"-i", videoPath,
		"-i", audioPath,
		"-c:v", "copy",
		"-c:a", "aac",
		"-b:a", "192k",
		"-shortest",
		outputPath,
	)

	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("audio/muxFFmpeg: %w (output: %s)", err, string(out))
	}
	return nil
}
