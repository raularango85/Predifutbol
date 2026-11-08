/**
 * server.js
 *
 * PrediFutbol Local Engine v2 - Express Backend API & Static Server
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./services/db');
const apiFootball = require('./services/apiFootball');
const { exportCardAssets } = require('./renderer');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/exports', express.static(path.join(__dirname, 'exports')));

// Main Studio Dashboard UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Engine & DB Status
app.get('/api/status', (req, res) => {
  res.json(db.getStatus());
});

// Localization Dictionary (EN / ES)
app.get('/api/localize/:lang', (req, res) => {
  const lang = req.params.lang === 'es' ? 'es' : 'en';
  const localePath = path.join(__dirname, 'locales', `${lang}.json`);
  if (!fs.existsSync(localePath)) {
    return res.status(404).json({ error: 'Locale not found' });
  }
  const dict = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  res.json(dict);
});

// Search Teams (6,139+ Yii2 teams with crests & linked stadiums)
app.get('/api/teams', async (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = req.query.limit || 25;
    const teams = await db.searchTeams({ q, limit });
    res.json({ results: teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search Leagues (941+ Yii2 leagues)
app.get('/api/leagues', async (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = req.query.limit || 30;
    const leagues = await db.searchLeagues({ q, limit });
    res.json({ results: leagues });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Structured Prediction Markets (from Yii2 type_predictions)
app.get('/api/type-predictions', async (req, res) => {
  try {
    const types = await db.getTypePredictions();
    res.json({ results: types });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search Synced Fixtures
app.get('/api/fixtures', async (req, res) => {
  try {
    const q = req.query.q || '';
    const date = req.query.date || '';
    const limit = req.query.limit || 30;
    const fixtures = await db.searchFixtures({ q, date, limit });
    res.json({ results: fixtures });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger API-Football v3 Sync by Date (Ported from Yii2 FootballClient)
app.post('/api/fixtures/sync', async (req, res) => {
  try {
    const date = req.body.date || new Date().toISOString().slice(0, 10);
    const timezone = req.body.timezone || process.env.DEFAULT_TIMEZONE || 'America/Bogota';
    const result = await apiFootball.syncFixturesByDate(date, timezone);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List Saved Match Cards with pagination & search
app.get('/api/predictions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || req.query.q || '').trim();
    const data = await db.getPredictions({ page, limit, search });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Prediction by ID
app.get('/api/predictions/:id', async (req, res) => {
  try {
    const pred = await db.getPredictionById(req.params.id);
    if (!pred) return res.status(404).json({ success: false, error: 'Prediction not found' });
    res.json({ success: true, prediction: pred });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save or Update a Match Card
app.post('/api/predictions', async (req, res) => {
  try {
    const saved = await db.savePrediction(req.body);
    res.json({ success: true, prediction: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete a Saved Match Card
app.delete('/api/predictions/:id', async (req, res) => {
  try {
    await db.deletePrediction(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Export jobs (1080x1920 PNG or frame-by-frame MP4 via Playwright)
// Exports run in the background; the UI polls /api/export/jobs/:id for progress.
// ---------------------------------------------------------------------------
const exportJobs = new Map();
let activeExportJobId = null;

function loadRenderer() {
  delete require.cache[require.resolve('./renderer')];
  return require('./renderer');
}

function publicJob(job) {
  return {
    id: job.id,
    format: job.format,
    status: job.status,
    percent: Math.round(job.percent * 10) / 10,
    stage: job.stage,
    frame: job.frame,
    totalFrames: job.totalFrames,
    etaSec: job.etaSec,
    elapsedSec: Math.round((Date.now() - job.startedAt) / 1000),
    files: job.files,
    error: job.error
  };
}

app.post('/api/export', (req, res) => {
  const { cardData, format = 'png', langs = ['en'] } = req.body;
  if (!cardData) {
    return res.status(400).json({ success: false, error: 'Missing cardData payload' });
  }
  if (activeExportJobId) {
    return res.json({
      success: true,
      jobId: activeExportJobId,
      alreadyRunning: true
    });
  }

  const job = {
    id: `job_${Date.now().toString(36)}`,
    format,
    status: 'running',
    percent: 0,
    stage: 'En cola...',
    frame: 0,
    totalFrames: 0,
    etaSec: null,
    startedAt: Date.now(),
    files: [],
    error: null
  };
  exportJobs.set(job.id, job);
  activeExportJobId = job.id;

  const { exportCardAssets } = loadRenderer();
  exportCardAssets({
    cardData,
    format,
    langs: Array.isArray(langs) && langs.length > 0 ? langs : ['en'],
    port: PORT,
    onProgress: info => {
      job.percent = Math.min(100, Math.max(job.percent, Number(info.percent) || 0));
      if (info.stage) job.stage = info.stage;
      if (info.frame != null) job.frame = info.frame;
      if (info.totalFrames != null) job.totalFrames = info.totalFrames;
      job.etaSec = info.etaSec != null ? info.etaSec : job.etaSec;
    }
  })
    .then(files => {
      job.files = files.map(({ fullPath, ...rest }) => rest);
      job.status = 'done';
      job.percent = 100;
      job.stage = 'Completado';
      job.etaSec = 0;
      console.log(`✅ Export ${job.id} finished in ${Math.round((Date.now() - job.startedAt) / 1000)}s`);
    })
    .catch(err => {
      console.error('Export error:', err);
      job.status = 'error';
      job.error = err.message;
    })
    .finally(() => {
      activeExportJobId = null;
      // Forget finished jobs after 30 minutes
      setTimeout(() => exportJobs.delete(job.id), 30 * 60 * 1000);
    });

  res.json({ success: true, jobId: job.id });
});

app.get('/api/export/jobs/:id', (req, res) => {
  const job = exportJobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  res.json({ success: true, job: publicJob(job) });
});

async function start() {
  await db.initDb();
  app.listen(PORT, () => {
    console.log(`\n⚡ PrediFutbol Local Engine v2 running at http://localhost:${PORT}`);
  });
}

start();
