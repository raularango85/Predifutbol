package media

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
	"predifutbol/backend/internal/domain"
	"predifutbol/backend/pkg/audio"
)

type ProgressCallback func(percent float64, stage string, frame, totalFrames int, etaSec *int)

type MediaRenderer struct {
	ffmpegPath   string
	exportsDir   string
	audioService *audio.AudioService
	fps          int
	durationSec  int
}

func NewMediaRenderer(ffmpegPath, exportsDir string, audioService *audio.AudioService) *MediaRenderer {
	if ffmpegPath == "" {
		if path, err := exec.LookPath("ffmpeg"); err == nil {
			ffmpegPath = path
		} else {
			candidate := filepath.Join("..", "node_modules", "ffmpeg-static", "ffmpeg.exe")
			if _, err := os.Stat(candidate); err == nil {
				ffmpegPath = candidate
			}
		}
	}
	return &MediaRenderer{
		ffmpegPath:   ffmpegPath,
		exportsDir:   exportsDir,
		audioService: audioService,
		fps:          30,
		durationSec:  15,
	}
}

var slugRegex = regexp.MustCompile(`[^a-zA-Z0-9]+`)

func SanitizeSlug(str string) string {
	s := strings.ToUpper(strings.TrimSpace(str))
	s = slugRegex.ReplaceAllString(s, "_")
	s = strings.Trim(s, "_")
	if len(s) > 25 {
		s = s[:25]
	}
	if s == "" {
		s = "MATCH"
	}
	return s
}

const virtualClockScript = `
(function() {
  if (window.__vtInstalled) return;
  window.__vtInstalled = true;

  const vt = { now: 0, seq: 0, timers: [], anims: new Map() };

  const schedule = (fn, ms, args, repeat) => {
    const id = 900000 + (++vt.seq);
    const delay = Math.max(0, Number(ms) || 0);
    vt.timers.push({ id, order: vt.seq, at: vt.now + delay, fn, args, interval: repeat ? Math.max(1, delay) : 0 });
    return id;
  };

  window.setTimeout = (fn, ms, ...args) => schedule(fn, ms, args, false);
  window.setInterval = (fn, ms, ...args) => schedule(fn, ms, args, true);
  window.clearTimeout = window.clearInterval = id => {
    vt.timers = vt.timers.filter(t => t.id !== id);
  };

  const sync = (baseForNew, preservePhase) => {
    const live = document.getAnimations();
    const liveSet = new Set(live);
    for (const anim of live) {
      if (!vt.anims.has(anim)) {
        const current = Number(anim.currentTime) || 0;
        vt.anims.set(anim, preservePhase ? baseForNew - current : baseForNew);
      }
    }
    for (const [anim, base] of vt.anims) {
      if (!liveSet.has(anim)) {
        vt.anims.delete(anim);
        continue;
      }
      try {
        anim.pause();
        anim.currentTime = Math.max(0, vt.now - base);
      } catch (e) {}
    }
  };

  sync(0, true);
  window.__vtSync = () => sync(vt.now, false);

  window.__vtAdvanceTo = target => {
    if (typeof window.__vtSceneAdvanceTo === 'function') {
      try { window.__vtSceneAdvanceTo(target); } catch (e) {}
    }
    let guard = 0;
    while (guard++ < 20000) {
      let next = null;
      for (const t of vt.timers) {
        if (t.at <= target && (!next || t.at < next.at || (t.at === next.at && t.order < next.order))) {
          next = t;
        }
      }
      if (!next) break;

      vt.now = next.at;
      if (next.interval) {
        next.at += next.interval;
      } else {
        vt.timers = vt.timers.filter(t => t !== next);
      }
      try {
        if (typeof next.fn === 'function') next.fn(...(next.args || []));
      } catch (e) {}
      sync(vt.now, false);
    }
    vt.now = target;
    sync(vt.now, false);
    return vt.now;
  };
})();
`

type ExportOptions struct {
	Prediction *domain.Prediction
	Format     domain.ExportFormat
	Langs      []string
	Port       int
	OnProgress ProgressCallback
}

func detectH264Encoder(ffmpegPath string) (string, []string) {
	cmd := exec.Command(ffmpegPath, "-encoders")
	out, err := cmd.Output()
	if err == nil {
		outStr := string(out)
		// 1. Try NVIDIA NVENC (if NVIDIA GPU present)
		if strings.Contains(outStr, "h264_nvenc") {
			testCmd := exec.Command(ffmpegPath, "-f", "lavfi", "-i", "color=c=black:s=128x128:d=0.1", "-c:v", "h264_nvenc", "-f", "null", "-")
			if testCmd.Run() == nil {
				return "h264_nvenc", []string{"-preset", "p4", "-cq", "20", "-pix_fmt", "yuv420p"}
			}
		}
		// 2. Try Windows Media Foundation (MediaFoundation hardware acceleration for Intel UHD / AMD / NVIDIA on Windows)
		if strings.Contains(outStr, "h264_mf") {
			testCmd := exec.Command(ffmpegPath, "-f", "lavfi", "-i", "color=c=black:s=128x128:d=0.1", "-c:v", "h264_mf", "-f", "null", "-")
			if testCmd.Run() == nil {
				return "h264_mf", []string{"-b:v", "6M", "-pix_fmt", "yuv420p"}
			}
		}
		// 3. Try Intel Quick Sync Video (QSV)
		if strings.Contains(outStr, "h264_qsv") {
			testCmd := exec.Command(ffmpegPath, "-f", "lavfi", "-i", "color=c=black:s=128x128:d=0.1", "-c:v", "h264_qsv", "-f", "null", "-")
			if testCmd.Run() == nil {
				return "h264_qsv", []string{"-global_quality", "22", "-pix_fmt", "nv12"}
			}
		}
	}
	// Fallback to fast CPU libx264
	return "libx264", []string{"-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p"}
}

func captureJpegAction(quality int64, out *[]byte) chromedp.Action[chromedp.Void] {
	return func(ctx context.Context, t *chromedp.Target) (chromedp.Void, error) {
		optSpeed := true
		res, err := cdp.Call(ctx, t, page.CaptureScreenshot, page.CaptureScreenshotParams{
			Format:           page.CaptureScreenshotFormatJpeg,
			Quality:          &quality,
			OptimizeForSpeed: &optSpeed,
		})
		if err != nil {
			return chromedp.Void{}, err
		}
		*out = res.Data
		return chromedp.Void{}, nil
	}
}

func (r *MediaRenderer) Render(ctx context.Context, opts ExportOptions) ([]domain.ExportFile, error) {
	if err := os.MkdirAll(r.exportsDir, 0755); err != nil {
		return nil, fmt.Errorf("media/ensureExportsDir: %w", err)
	}

	report := func(percent float64, stage string, frame, totalFrames int, etaSec *int) {
		if opts.OnProgress != nil {
			opts.OnProgress(percent, stage, frame, totalFrames, etaSec)
		}
	}

	report(1.0, "Iniciando motor Chromium headless con aceleración GPU...", 0, 0, nil)

	allocOpts := []chromedp.ExecAllocatorOption{
		chromedp.NoFirstRun,
		chromedp.NoDefaultBrowserCheck,
		chromedp.NoSandbox,
		chromedp.Flag("headless", "new"),
		chromedp.Flag("use-gl", "angle"),
		chromedp.Flag("use-angle", "d3d11"),
		chromedp.Flag("enable-gpu", true),
		chromedp.Flag("enable-gpu-rasterization", true),
		chromedp.Flag("enable-zero-copy", true),
		chromedp.Flag("ignore-gpu-blocklist", true),
		chromedp.Flag("enable-hardware-overlays", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("disable-background-timer-throttling", true),
		chromedp.Flag("disable-renderer-backgrounding", true),
		chromedp.Flag("disable-backgrounding-occluded-windows", true),
		chromedp.Flag("disable-breakpad", true),
		chromedp.Flag("disable-extensions", true),
		chromedp.Flag("disable-default-apps", true),
		chromedp.Flag("disable-sync", true),
		chromedp.Flag("force-color-profile", "srgb"),
		chromedp.Flag("hide-scrollbars", true),
		chromedp.Flag("mute-audio", true),
	}

	allocCtx, cancelAlloc := chromedp.NewExecAllocator(ctx, allocOpts...)
	defer cancelAlloc()

	browserCtx, cancelBrowser := chromedp.NewContext(allocCtx)
	defer cancelBrowser()

	langs := opts.Langs
	if len(langs) == 0 {
		langs = []string{"es"}
	}

	datePrefix := time.Now().Format("2006-01-02")
	matchSlug := fmt.Sprintf("%s_vs_%s", SanitizeSlug(opts.Prediction.HomeName), SanitizeSlug(opts.Prediction.AwayName))
	ts := fmt.Sprintf("%05d", time.Now().UnixNano()%100000)

	outputFiles := make([]domain.ExportFile, 0, len(langs))
	cardJSON, _ := json.Marshal(opts.Prediction)
	encodedData := url.QueryEscape(string(cardJSON))

	for langIdx, lang := range langs {
		langUpper := strings.ToUpper(lang)
		langSpan := 100.0 / float64(len(langs))
		langStart := float64(langIdx) * langSpan

		targetURL := fmt.Sprintf("http://127.0.0.1:%d/render-canvas?render=1&lang=%s&data=%s",
			opts.Port, lang, encodedData)

		tabCtx, cancelTab := chromedp.NewContext(browserCtx)

		if opts.Format == domain.ExportFormatPNG {
			report(langStart+langSpan*0.3, fmt.Sprintf("Generando snapshot PNG 1080x1920 (%s)...", langUpper), 0, 0, nil)

			pngURL := fmt.Sprintf("%s&format=png", targetURL)
			err := chromedp.Do(tabCtx,
				chromedp.EmulateViewport(540, 960, chromedp.EmulateScale(2.0), chromedp.EmulatePortrait),
				chromedp.Navigate(pngURL),
				chromedp.Sleep(700*time.Millisecond),
				chromedp.Evaluate[chromedp.Void]("window.__vtInstantFinalState && window.__vtInstantFinalState();"),
			)
			if err != nil {
				cancelTab()
				return nil, fmt.Errorf("media/navigatePNG: %w", err)
			}

			buf, err := chromedp.Run(tabCtx, chromedp.CaptureScreenshot())
			cancelTab()

			if err != nil {
				return nil, fmt.Errorf("media/capturePNG: %w", err)
			}

			fileName := fmt.Sprintf("%s_%s_%s_%s.png", datePrefix, matchSlug, langUpper, ts)
			finalPath := filepath.Join(r.exportsDir, fileName)
			if err := os.WriteFile(finalPath, buf, 0644); err != nil {
				return nil, fmt.Errorf("media/writePNG: %w", err)
			}

			outputFiles = append(outputFiles, domain.ExportFile{
				Lang:     lang,
				Format:   string(domain.ExportFormatPNG),
				FileName: fileName,
				URL:      fmt.Sprintf("/exports/%s", fileName),
			})

		} else {
			// Video MP4 frame-by-frame
			report(langStart+langSpan*0.05, fmt.Sprintf("Sintetizando banda sonora y locución IA (%s)...", langUpper), 0, 0, nil)

			tempAudioPath := filepath.Join(os.TempDir(), fmt.Sprintf("predifutbol_a_%d.mp3", time.Now().UnixNano()))
			defer os.Remove(tempAudioPath)

			hasAudio, _ := r.audioService.MixVideoAudioTrack(ctx, opts.Prediction, lang, float64(r.durationSec), tempAudioPath)

			totalFrames := r.fps * r.durationSec
			frameMs := 1000.0 / float64(r.fps)

			fileName := fmt.Sprintf("%s_%s_%s_%s.mp4", datePrefix, matchSlug, langUpper, ts)
			finalPath := filepath.Join(r.exportsDir, fileName)
			tempVideoPath := filepath.Join(os.TempDir(), fmt.Sprintf("predifutbol_v_%d.mp4", time.Now().UnixNano()))
			defer os.Remove(tempVideoPath)

			videoTarget := tempVideoPath
			if !hasAudio {
				videoTarget = finalPath
			}

			encoderCodec, encoderArgs := detectH264Encoder(r.ffmpegPath)
			ffmpegArgs := []string{
				"-y",
				"-f", "image2pipe",
				"-framerate", fmt.Sprintf("%d", r.fps),
				"-c:v", "mjpeg",
				"-i", "pipe:0",
				"-vf", "scale=1080:1920:flags=bicubic,format=yuv420p",
				"-c:v", encoderCodec,
			}
			ffmpegArgs = append(ffmpegArgs, encoderArgs...)
			ffmpegArgs = append(ffmpegArgs,
				"-r", fmt.Sprintf("%d", r.fps),
				"-movflags", "+faststart",
				videoTarget,
			)

			ffmpegCmd := exec.CommandContext(ctx, r.ffmpegPath, ffmpegArgs...)
			var ffmpegStderr bytes.Buffer
			ffmpegCmd.Stderr = &ffmpegStderr

			ffmpegStdin, err := ffmpegCmd.StdinPipe()
			if err != nil {
				cancelTab()
				return nil, fmt.Errorf("media/ffmpegStdin: %w", err)
			}

			if err := ffmpegCmd.Start(); err != nil {
				cancelTab()
				return nil, fmt.Errorf("media/ffmpegStart: %w", err)
			}

			renderStart := time.Now()

			err = chromedp.Do(tabCtx,
				chromedp.EmulateViewport(540, 960, chromedp.EmulateScale(2.0), chromedp.EmulatePortrait),
				chromedp.Navigate(targetURL),
				chromedp.Sleep(800*time.Millisecond),
				chromedp.Evaluate[chromedp.Void](virtualClockScript),
			)
			if err != nil {
				cancelTab()
				_ = ffmpegStdin.Close()
				_ = ffmpegCmd.Process.Kill()
				return nil, fmt.Errorf("media/navigateVideo: %w", err)
			}

			var frameBuf []byte
			captureAct := captureJpegAction(86, &frameBuf)

			for f := 0; f < totalFrames; f++ {
				ms := int(float64(f) * frameMs)
				advanceScript := fmt.Sprintf("if (window.__vtSceneAdvanceTo) { window.__vtSceneAdvanceTo(%d); } if (window.__vtAdvanceTo) { window.__vtAdvanceTo(%d); }", ms, ms)

				err := chromedp.Do(tabCtx,
					chromedp.Evaluate[chromedp.Void](advanceScript),
					captureAct,
				)
				if err != nil {
					_ = ffmpegStdin.Close()
					_ = ffmpegCmd.Process.Kill()
					cancelTab()
					return nil, fmt.Errorf("media/captureFrame %d: %w", f, err)
				}

				if _, err := ffmpegStdin.Write(frameBuf); err != nil {
					_ = ffmpegStdin.Close()
					cancelTab()
					return nil, fmt.Errorf("media/writeFramePipe %d: %w | stderr: %s", f, err, ffmpegStderr.String())
				}

				elapsed := time.Since(renderStart).Seconds()
				eta := int((elapsed / float64(f+1)) * float64(totalFrames-f-1))
				fraction := float64(f+1) / float64(totalFrames)

				report(
					langStart+langSpan*(0.06+0.90*fraction),
					fmt.Sprintf("Renderizando fotograma %d de %d (%s) [%s GPU]", f+1, totalFrames, langUpper, strings.ToUpper(encoderCodec)),
					f+1, totalFrames, &eta,
				)
			}

			_ = ffmpegStdin.Close()
			if err := ffmpegCmd.Wait(); err != nil {
				cancelTab()
				return nil, fmt.Errorf("media/ffmpegWait: %w | stderr: %s", err, ffmpegStderr.String())
			}
			cancelTab()

			if hasAudio {
				report(langStart+langSpan*0.98, fmt.Sprintf("Mezclando video y audio estéreo (%s)...", langUpper), totalFrames, totalFrames, nil)
				if err := r.audioService.MuxVideoAndAudio(ctx, tempVideoPath, tempAudioPath, finalPath); err != nil {
					_ = os.Rename(tempVideoPath, finalPath)
				}
			}

			outputFiles = append(outputFiles, domain.ExportFile{
				Lang:     lang,
				Format:   string(domain.ExportFormatVideo),
				FileName: fileName,
				URL:      fmt.Sprintf("/exports/%s", fileName),
			})
		}
	}

	report(100.0, "Exportación completada exitosamente", 0, 0, nil)
	return outputFiles, nil
}
