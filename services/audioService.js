/**
 * services/audioService.js
 *
 * Audio synthesis, neural TTS voiceover, and soundtrack engine for PrediFutbol.
 * Integrates:
 * - Edge-TTS (free, ultra-natural neural voices in Spanish & English)
 * - FFmpeg synthesis for SFX (Whoosh transitions & Ding prediction highlights)
 * - 120 BPM Sporty Electronic Beat loop (BGM)
 * - Audio muxing for 1080x1920 MP4 video exports
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

let ffmpegStaticPath = null;
try {
  ffmpegStaticPath = require('ffmpeg-static');
} catch (e) {
  ffmpegStaticPath = null;
}

const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');
const SFX_WHOOSH = path.join(AUDIO_DIR, 'sfx_whoosh.mp3');
const SFX_DING = path.join(AUDIO_DIR, 'sfx_ding.mp3');
const BGM_CROWD = path.join(AUDIO_DIR, 'bgm_stadium_crowd.mp3');
const BGM_BEAT = path.join(AUDIO_DIR, 'bgm_sport_beat.mp3');
const ROOT_CROWD_WAV = path.join(__dirname, '..', '654083__dan_audiofile__football-match_crowd_cheer_ambience-stereo.wav');

function ensureAudioDir() {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
}

/**
 * Ensure the base SFX, stadium crowd, and BGM files exist; synthesize or convert if missing.
 */
function ensureBaseAudioAssets() {
  ensureAudioDir();
  if (!ffmpegStaticPath || !fs.existsSync(ffmpegStaticPath)) return;

  // Authentic 15s Stadium Crowd Ambience
  if (!fs.existsSync(BGM_CROWD) && fs.existsSync(ROOT_CROWD_WAV)) {
    try {
      execFileSync(ffmpegStaticPath, [
        '-y',
        '-stream_loop', '2',
        '-i', ROOT_CROWD_WAV,
        '-t', '15',
        '-af', 'afade=t=in:ss=0:d=0.5,afade=t=out:st=13.5:d=1.5',
        '-b:a', '192k',
        BGM_CROWD
      ]);
    } catch (e) {
      console.warn('Could not generate bgm_stadium_crowd.mp3:', e.message);
    }
  }

  if (!fs.existsSync(SFX_WHOOSH)) {
    try {
      execFileSync(ffmpegStaticPath, [
        '-y',
        '-f', 'lavfi',
        '-i', 'anoisesrc=d=0.7:c=pink:r=44100,lowpass=f=1200,volume=3,afade=t=in:ss=0:d=0.25,afade=t=out:st=0.35:d=0.35',
        '-b:a', '192k',
        SFX_WHOOSH
      ]);
    } catch (e) {
      console.warn('Could not generate sfx_whoosh.mp3:', e.message);
    }
  }

  if (!fs.existsSync(SFX_DING)) {
    try {
      execFileSync(ffmpegStaticPath, [
        '-y',
        '-f', 'lavfi',
        '-i', 'sine=f=1174.66:d=0.9,volume=1.2,afade=t=out:st=0.1:d=0.8',
        '-b:a', '192k',
        SFX_DING
      ]);
    } catch (e) {
      console.warn('Could not generate sfx_ding.mp3:', e.message);
    }
  }

  if (!fs.existsSync(BGM_BEAT)) {
    try {
      execFileSync(ffmpegStaticPath, [
        '-y',
        '-f', 'lavfi',
        '-i', 'anoisesrc=d=15:c=brown:r=44100,lowpass=f=180,tremolo=f=4:d=0.9,volume=4',
        '-f', 'lavfi',
        '-i', 'sine=f=110:d=15,tremolo=f=2:d=0.8,volume=1.5',
        '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first,volume=1.8,afade=t=out:st=13.5:d=1.5[aout]',
        '-map', '[aout]',
        '-b:a', '192k',
        BGM_BEAT
      ]);
    } catch (e) {
      console.warn('Could not generate bgm_sport_beat.mp3:', e.message);
    }
  }
}

/**
 * Clean text strings for TTS narration (removes emojis and unneeded punctuation).
 */
function cleanForSpeech(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[•|#⚡🔥🛡️⚽🔔📢🎯]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build dynamic sport narration script for a given card match payload.
 */
function buildNarrationText(cardData, lang = 'es') {
  const isEs = lang === 'es';
  const home = cleanForSpeech(cardData.home_name || cardData.homeName || 'Local');
  const away = cleanForSpeech(cardData.away_name || cardData.awayName || 'Visitante');
  const pick = isEs 
    ? cleanForSpeech(cardData.custom_pick_es || cardData.prediction || 'Victoria Local')
    : cleanForSpeech(cardData.custom_pick_en || cardData.prediction || 'Home Win');

  const odd = parseFloat(cardData.odd) || 1.75;
  const oddStr = odd.toFixed(2).replace('.', isEs ? ' punto ' : ' point ');
  const prob = parseInt(cardData.probability, 10) || 70;

  if (isEs) {
    return (
      `¡${home} recibe a ${away}! ` +
      `Nuestra predicción de valor: ${pick}, a cuota ${oddStr} y ${prob} por ciento de probabilidad. ` +
      `¡Síguenos en TikTok!`
    );
  } else {
    return (
      `¡${home} takes on ${away}! ` +
      `Our top value pick: ${pick}, at odds ${oddStr} with ${prob} percent confidence. ` +
      `Follow us on TikTok!`
    );
  }
}

/**
 * Generate speech file using Edge-TTS via python.
 */
async function generateSpeech({ text, lang = 'es', voice = null, outputPath }) {
  const chosenVoice = voice || (lang === 'es' ? 'es-CO-GonzaloNeural' : 'en-US-ChristopherNeural');
  // +15% rate delivers energetic sports tempo and fits comfortably in 10-11s
  const rate = '+15%';

  try {
    execFileSync('python', [
      '-m', 'edge_tts',
      '--voice', chosenVoice,
      '--rate', rate,
      '--text', text,
      '--write-media', outputPath
    ], { timeout: 15000 });
    return true;
  } catch (err) {
    console.warn(`[audioService] Failed to generate TTS speech: ${err.message}`);
    return false;
  }
}

/**
 * Mix full 15s soundtrack:
 * - Narration at t=0.6s
 * - Sporty beat loop
 * - Whoosh transition SFX at t=0s
 * - Ding reveal SFX at t=5.5s
 */
async function mixVideoAudioTrack({ cardData, lang = 'es', durationSec = 15, outputPath }) {
  ensureBaseAudioAssets();

  const tempNarration = path.join(os.tmpdir(), `predifutbol_tts_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp3`);
  const text = buildNarrationText(cardData, lang);

  let hasVoice = false;
  try {
    hasVoice = await generateSpeech({ text, lang, outputPath: tempNarration });
  } catch (e) {
    hasVoice = false;
  }

  if (!ffmpegStaticPath || !fs.existsSync(ffmpegStaticPath)) {
    return false;
  }

  try {
    const bgmSource = fs.existsSync(BGM_CROWD) ? BGM_CROWD : BGM_BEAT;
    const isCrowd = bgmSource === BGM_CROWD;

    // When commentator speaks (0.5s - 11.2s), duck crowd volume to 0.18.
    // In intro and outro, crowd roar rises to 0.42 for stadium energy.
    const bgmFilter = isCrowd
      ? `volume='if(between(t,0.5,11.2), 0.18, 0.42)':eval=frame,afade=t=out:st=${Math.max(1, durationSec - 1.5)}:d=1.5[bg]`
      : `volume=0.35,afade=t=out:st=${Math.max(1, durationSec - 1.5)}:d=1.5[bg]`;

    if (hasVoice && fs.existsSync(tempNarration) && fs.existsSync(bgmSource) && fs.existsSync(SFX_WHOOSH) && fs.existsSync(SFX_DING)) {
      // Full Mix: Commentator Voice + Stadium Crowd (ducked) + Whoosh + Ding
      execFileSync(ffmpegStaticPath, [
        '-y',
        '-i', tempNarration,
        '-i', bgmSource,
        '-i', SFX_WHOOSH,
        '-i', SFX_DING,
        '-filter_complex',
        `[0:a]adelay=500|500,volume=1.35[v];` +
        `[1:a]${bgmFilter};` +
        `[2:a]adelay=0|0,volume=0.65[w];` +
        `[3:a]adelay=5500|5500,volume=0.75[d];` +
        `[v][bg][w][d]amix=inputs=4:duration=longest:dropout_transition=2[outa]`,
        '-map', '[outa]',
        '-t', String(durationSec),
        '-b:a', '192k',
        outputPath
      ]);
    } else if (fs.existsSync(bgmSource)) {
      // Fallback: Background only
      execFileSync(ffmpegStaticPath, [
        '-y',
        '-i', bgmSource,
        '-af', `volume=${isCrowd ? '0.45' : '0.40'},afade=t=out:st=${Math.max(1, durationSec - 1.5)}:d=1.5`,
        '-t', String(durationSec),
        '-b:a', '192k',
        outputPath
      ]);
    } else {
      return false;
    }

    return fs.existsSync(outputPath);
  } catch (err) {
    console.warn(`[audioService] Mix error: ${err.message}`);
    return false;
  } finally {
    if (fs.existsSync(tempNarration)) {
      try { fs.unlinkSync(tempNarration); } catch (e) {}
    }
  }
}

/**
 * Multiplex video and audio stream into a final faststart MP4.
 */
function muxVideoAndAudio({ videoPath, audioPath, outputPath }) {
  if (!ffmpegStaticPath || !fs.existsSync(ffmpegStaticPath)) {
    throw new Error('FFmpeg static path not available');
  }

  execFileSync(ffmpegStaticPath, [
    '-y',
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-shortest',
    outputPath
  ]);

  return fs.existsSync(outputPath);
}

module.exports = {
  ensureBaseAudioAssets,
  buildNarrationText,
  generateSpeech,
  mixVideoAudioTrack,
  muxVideoAndAudio,
  AUDIO_DIR
};
