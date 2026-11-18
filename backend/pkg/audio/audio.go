package audio

import (
	"context"
	"fmt"
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
	pick := CleanForSpeech(rawPick)
	if pick == "" {
		if isEs {
			pick = "Victoria Local"
		} else {
			pick = "Home Win"
		}
	}

	odd := p.Odd
	if odd <= 0 {
		odd = 1.75
	}
	pointWord := " punto "
	if !isEs {
		pointWord = " point "
	}
	oddStr := strings.ReplaceAll(fmt.Sprintf("%.2f", odd), ".", pointWord)

	prob := p.Probability
	if prob <= 0 {
		prob = 70
	}

	if isEs {
		return fmt.Sprintf(
			"¡%s recibe a %s! Nuestra predicción de valor: %s, a cuota %s y %d por ciento de probabilidad. ¡Síguenos en TikTok... ¡Somos PrediFutbol Colombia!",
			home, away, pick, oddStr, prob,
		)
	}

	return fmt.Sprintf(
		"¡%s takes on %s! Our top value pick: %s, at odds %s with %d percent confidence. Follow us on TikTok... We are PrediFutbol Colombia!",
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
	rate := "+18%"

	tempTextFile := filepath.Join(os.TempDir(), fmt.Sprintf("predifutbol_tts_in_%d.txt", time.Now().UnixNano()))
	if err := os.WriteFile(tempTextFile, []byte(text), 0644); err != nil {
		return fmt.Errorf("audio/writeTempText: %w", err)
	}
	defer os.Remove(tempTextFile)

	var lastErr error
	for _, v := range voicesToTry {
		for attempt := 1; attempt <= 2; attempt++ {
			_ = os.Remove(outputPath)

			cmd := exec.CommandContext(ctx, "python",
				"-m", "edge_tts",
				"--voice", v,
				"--rate", rate,
				"--file", tempTextFile,
				"--write-media", outputPath,
			)

			if err := cmd.Run(); err == nil {
				if info, statErr := os.Stat(outputPath); statErr == nil && info.Size() > 1024 {
					return nil
				}
			} else {
				lastErr = err
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
			"[0:a]adelay=400|400,volume=2.6[vox];"+
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
