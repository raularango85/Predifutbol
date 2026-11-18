/**
 * renderer.js
 *
 * Playwright 1080x1920 (9:16) Export Engine for PrediFutbol.
 *
 * - PNG: crisp 1080x1920 snapshot of the final card state.
 * - Video: deterministic frame-by-frame rendering. Instead of recording the screen in
 *   real time (which drops/freezes frames on slower machines), the page runs on a
 *   virtual clock: JS timers and every CSS animation/transition are paused and advanced
 *   exactly 1/FPS seconds per frame, a screenshot is taken, and frames are piped into
 *   FFmpeg. The result is identical on any machine; slower hardware only takes longer.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const audioService = require('./services/audioService');

let ffmpegStaticPath = null;
try {
  ffmpegStaticPath = require('ffmpeg-static');
} catch (e) {
  ffmpegStaticPath = null;
}

const EXPORTS_DIR = path.join(__dirname, 'exports');
const VIDEO_FPS = Math.min(60, Math.max(24, Number(process.env.VIDEO_FPS) || 30));
const VIDEO_DURATION_SEC = Math.max(5, Number(process.env.VIDEO_DURATION_SEC) || 15);

function ensureExportsDir() {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }
}

function sanitizeSlug(str) {
  return String(str || 'MATCH')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 30);
}

/**
 * Pre-fetch any remote or local image URL into a base64 data URI before launching the page.
 * This guarantees synchronous rendering in the browser with zero empty crest boxes.
 */
async function resolveImageToDataUrl(urlOrEmoji) {
  const val = String(urlOrEmoji || '').trim();
  if (!val) return val;

  try {
    if (val.startsWith('data:')) {
      return val;
    }
    if (val.startsWith('http://') || val.startsWith('https://')) {
      const res = await fetch(val, { signal: AbortSignal.timeout(3500) }).catch(() => null);
      if (!res || !res.ok) return val;
      const contentType = res.headers.get('content-type') || 'image/png';
      const arrayBuf = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString('base64');
      return `data:${contentType};base64,${base64}`;
    }
    if (val.startsWith('/')) {
      const localPath = path.join(__dirname, val.replace(/^\/+/, ''));
      if (fs.existsSync(localPath)) {
        const ext = path.extname(localPath).toLowerCase();
        const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
        const base64 = fs.readFileSync(localPath).toString('base64');
        return `data:${mime};base64,${base64}`;
      }
    }
  } catch (err) {
    // Fallback to original URL if pre-fetch fails
  }
  return val;
}

function loadLocalDictionaries() {
  try {
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'en.json'), 'utf8'));
    const es = JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'es.json'), 'utf8'));
    return { en, es };
  } catch (err) {
    return null;
  }
}

async function launchBrowser() {
  const browserArgs = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--force-color-profile=srgb',
    '--hide-scrollbars',
    '--mute-audio'
  ];

  // Prioritize msedge on Windows to decouple from user's running Chrome window.
  // Independent process space prevents desktop window focus / single-instance lock contention.
  for (const opts of [
    { headless: true, channel: 'msedge', args: browserArgs },
    { headless: true, channel: 'chrome', args: browserArgs },
    { headless: true, args: browserArgs }
  ]) {
    try {
      return await chromium.launch(opts);
    } catch (e) {
      // try next channel
    }
  }
  throw new Error('Could not launch Chromium/Chrome/Edge. Run `npx playwright install chromium`.');
}

/**
 * Wait until Tailwind styles, Google Fonts, Lucide icons and all images are really ready.
 * Ensures all image pixels (crests and logos) are synchronously decoded into GPU/CPU memory
 * before capturing frame 0.
 */
async function preparePage(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});

  try {
    await page.waitForFunction(
      () => {
        const splash = document.getElementById('intro-splash');
        return !!splash && getComputedStyle(splash).position === 'absolute';
      },
      null,
      { timeout: 15000, polling: 100 }
    ).catch(() => {});
  } catch (e) {}

  await page.evaluate(async () => {
    if (window.lucide && document.querySelector('i[data-lucide]')) {
      try { window.lucide.createIcons(); } catch (e) {}
    }

    try {
      if (document.fonts && document.fonts.ready) {
        await Promise.race([
          document.fonts.ready,
          new Promise(r => setTimeout(r, 4000))
        ]);
      }
    } catch (e) {}

    // Fully decode every image into memory before capturing frame 0
    try {
      const imgs = [...document.images];
      await Promise.all(
        imgs.map(img => {
          if (img.decode) return img.decode().catch(() => {});
          if (img.complete) return Promise.resolve();
          return new Promise(r => {
            img.onload = img.onerror = r;
            setTimeout(r, 2000);
          });
        })
      );
    } catch (e) {}
  });
}

/**
 * Injected into the page right before the animation starts.
 * Replaces setTimeout/setInterval with a virtual clock and takes manual control of every
 * CSS animation & transition (Web Animations API), so time only moves when we say so.
 */
function installVirtualClock() {
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

  // Register new animations (base = virtual start time) and pin every animation to virtual time
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
      } catch (e) { /* ignore */ }
    }
  };

  // Already-running infinite animations (logo float, aura, shimmer...) keep their phase
  sync(0, true);

  window.__vtSync = () => sync(vt.now, false);

  window.__vtAdvanceTo = target => {
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
      } catch (e) {
        console.error('Virtual timer error:', e);
      }
      // Transitions triggered by this timer start exactly at its virtual time
      sync(vt.now, false);
    }
    vt.now = target;
    sync(vt.now, false);
    return vt.now;
  };
}

function buildInitScript() {
  return ({ data, targetLang, logoUrl, localDicts }) => {
    window.__RENDER_CARD_DATA__ = data;
    window.__RENDER_LANG__ = targetLang;
    window.__RENDER_LOGO_DATA_URL__ = logoUrl;
    window.__RENDER_DICTS__ = localDicts;
  };
}

/**
 * Render a single-language video frame by frame and encode it with FFmpeg.
 */
async function renderVideoFrames({ page, context, finalPath, onFrame }) {
  if (!ffmpegStaticPath || !fs.existsSync(ffmpegStaticPath)) {
    throw new Error('FFmpeg no está disponible. Ejecuta `npm install ffmpeg-static`.');
  }

  const totalFrames = Math.round(VIDEO_FPS * VIDEO_DURATION_SEC);
  const frameMs = 1000 / VIDEO_FPS;

  await page.evaluate(installVirtualClock);
  await page.evaluate(() => {
    if (window.triggerAnimationSequence) {
      window.triggerAnimationSequence(true);
    }
    window.__vtSync();
  });

  const ffmpeg = spawn(
    ffmpegStaticPath,
    [
      '-y',
      '-f', 'image2pipe',
      '-framerate', String(VIDEO_FPS),
      '-c:v', 'mjpeg',
      '-i', 'pipe:0',
      '-vf', 'scale=1080:1920:flags=lanczos,format=yuv420p',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-r', String(VIDEO_FPS),
      '-movflags', '+faststart',
      finalPath
    ],
    { stdio: ['pipe', 'ignore', 'pipe'] }
  );

  let ffmpegLog = '';
  ffmpeg.stderr.on('data', chunk => {
    ffmpegLog = (ffmpegLog + chunk.toString()).slice(-4000);
  });
  ffmpeg.stdin.on('error', () => { /* surfaced through the close handler */ });
  const ffmpegDone = new Promise((resolve, reject) => {
    ffmpeg.on('error', reject);
    ffmpeg.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg terminó con código ${code}: ${ffmpegLog.slice(-600)}`));
    });
  });

  const cdp = await context.newCDPSession(page);

  try {
    for (let i = 0; i < totalFrames; i++) {
      await page.evaluate(ms => window.__vtAdvanceTo(ms), i * frameMs);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93 });
      const frame = Buffer.from(data, 'base64');

      if (ffmpeg.exitCode !== null) {
        throw new Error(`FFmpeg se detuvo inesperadamente: ${ffmpegLog.slice(-600)}`);
      }
      if (!ffmpeg.stdin.write(frame)) {
        await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
      }
      if (onFrame) onFrame(i + 1, totalFrames);
    }
  } catch (err) {
    try { ffmpeg.stdin.destroy(); } catch (e) { /* ignore */ }
    try { ffmpeg.kill('SIGKILL'); } catch (e) { /* ignore */ }
    throw err;
  } finally {
    await cdp.detach().catch(() => {});
  }

  ffmpeg.stdin.end();
  await ffmpegDone;
}

/**
 * Render match card(s) to /exports at 1080x1920 resolution.
 *
 * @param {Object} options
 * @param {Object} options.cardData - Match card data payload from the studio UI
 * @param {'png'|'video'} [options.format='png'] - Export format
 * @param {string[]} [options.langs=['en']] - Languages to export ('en', 'es')
 * @param {number} [options.port=3001] - Local Express server port
 * @param {Function} [options.onProgress] - Callback ({ percent, stage, frame, totalFrames, etaSec })
 */
async function exportCardAssets({ cardData, format = 'png', langs = ['en'], port = process.env.PORT || 3001, onProgress }) {
  ensureExportsDir();

  const report = info => {
    if (typeof onProgress === 'function') {
      try { onProgress(info); } catch (e) { /* ignore */ }
    }
  };

  report({ percent: 1, stage: 'Preparando escudos y logo en alta resolución...' });

  // Pre-convert team crests & PrediFutbol brand logo to inline base64 data URLs
  const [homeFlagDataUrl, awayFlagDataUrl, logoDataUrl] = await Promise.all([
    resolveImageToDataUrl(cardData.home_flag || cardData.homeFlag),
    resolveImageToDataUrl(cardData.away_flag || cardData.awayFlag),
    resolveImageToDataUrl('/public/logo_big_512_512.png')
  ]);

  const hydratedCardData = {
    ...cardData,
    home_flag: homeFlagDataUrl,
    away_flag: awayFlagDataUrl
  };
  const dicts = loadLocalDictionaries();

  report({ percent: 2, stage: 'Iniciando motor de renderizado...' });
  const browser = await launchBrowser();
  const generatedFiles = [];
  const datePrefix = new Date().toISOString().slice(0, 10);
  const matchSlug = `${sanitizeSlug(cardData.home_name)}_vs_${sanitizeSlug(cardData.away_name)}`;
  const timestamp = Date.now().toString().slice(-5);

  try {
    for (let langIdx = 0; langIdx < langs.length; langIdx++) {
      const lang = langs[langIdx];
      const langUpper = String(lang).toUpperCase();
      const baseUrl = `http://127.0.0.1:${port}/?render=1&lang=${encodeURIComponent(lang)}`;
      const langSpan = 100 / langs.length;
      const langStart = langIdx * langSpan;

      // 540x960 CSS viewport @2x = native 1080x1920 rasterization
      const context = await browser.newContext({
        viewport: { width: 540, height: 960 },
        deviceScaleFactor: 2
      });
      await context.addInitScript(buildInitScript(), {
        data: hydratedCardData,
        targetLang: lang,
        logoUrl: logoDataUrl,
        localDicts: dicts
      });

      try {
        const page = await context.newPage();

        if (format === 'video') {
          report({ percent: langStart + langSpan * 0.03, stage: `Cargando estilos y tipografías (${langUpper})...` });
          await page.goto(baseUrl, { waitUntil: 'commit', timeout: 60000 });
          await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
          await preparePage(page);

          const finalFileName = `${datePrefix}_${matchSlug}_${langUpper}_${timestamp}.mp4`;
          const finalPath = path.join(EXPORTS_DIR, finalFileName);
          const tempVideoPath = path.join(os.tmpdir(), `predifutbol_v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`);
          const tempAudioPath = path.join(os.tmpdir(), `predifutbol_a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`);

          report({ percent: langStart + langSpan * 0.04, stage: `Sintetizando narración deportiva IA y banda sonora (${langUpper})...` });

          let hasAudio = false;
          try {
            hasAudio = await audioService.mixVideoAudioTrack({
              cardData: hydratedCardData,
              lang,
              durationSec: VIDEO_DURATION_SEC,
              outputPath: tempAudioPath
            });
          } catch (audioErr) {
            console.warn('[renderer] Audio mix failed, continuing with video only:', audioErr.message);
            hasAudio = false;
          }

          const renderStart = Date.now();

          await renderVideoFrames({
            page,
            context,
            finalPath: hasAudio ? tempVideoPath : finalPath,
            onFrame: (frame, totalFrames) => {
              const fraction = frame / totalFrames;
              const elapsed = (Date.now() - renderStart) / 1000;
              const etaSec = Math.max(0, Math.round((elapsed / frame) * (totalFrames - frame)));
              report({
                percent: langStart + langSpan * (0.06 + 0.90 * fraction),
                stage: `Renderizando fotograma ${frame} de ${totalFrames} (${langUpper})`,
                frame,
                totalFrames,
                etaSec
              });
            }
          });

          if (hasAudio && fs.existsSync(tempVideoPath) && fs.existsSync(tempAudioPath)) {
            report({ percent: langStart + langSpan * 0.98, stage: `Mezclando video HD y audio estéreo (${langUpper})...` });
            try {
              audioService.muxVideoAndAudio({
                videoPath: tempVideoPath,
                audioPath: tempAudioPath,
                outputPath: finalPath
              });
            } catch (muxErr) {
              console.warn('[renderer] Muxing failed, falling back to raw video:', muxErr.message);
              fs.copyFileSync(tempVideoPath, finalPath);
            } finally {
              try { fs.unlinkSync(tempVideoPath); } catch (e) {}
              try { fs.unlinkSync(tempAudioPath); } catch (e) {}
            }
          }

          report({ percent: langStart + langSpan * 0.99, stage: `Video con audio listo (${langUpper})` });
          generatedFiles.push({
            lang,
            format: 'video',
            fileName: finalFileName,
            url: `/exports/${finalFileName}`,
            fullPath: finalPath
          });
        } else {
          report({ percent: langStart + langSpan * 0.2, stage: `Cargando tarjeta (${langUpper})...` });
          await page.goto(`${baseUrl}&instant=1`, { waitUntil: 'commit', timeout: 60000 });
          await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
          await preparePage(page);
          await page.evaluate(() => {
            if (window.showInstantFinalState) {
              window.showInstantFinalState();
            }
          });
          await page.waitForTimeout(250);

          const finalFileName = `${datePrefix}_${matchSlug}_${langUpper}_${timestamp}.png`;
          const finalPath = path.join(EXPORTS_DIR, finalFileName);
          await page.screenshot({ path: finalPath, type: 'png' });

          report({ percent: langStart + langSpan, stage: `Imagen lista (${langUpper})` });
          generatedFiles.push({
            lang,
            format: 'png',
            fileName: finalFileName,
            url: `/exports/${finalFileName}`,
            fullPath: finalPath
          });
        }
      } finally {
        await context.close().catch(() => {});
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  report({ percent: 100, stage: 'Completado' });
  return generatedFiles;
}

module.exports = {
  exportCardAssets,
  VIDEO_FPS,
  VIDEO_DURATION_SEC
};
