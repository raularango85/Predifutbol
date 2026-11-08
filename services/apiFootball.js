/**
 * services/apiFootball.js
 *
 * Node.js port of legacy Yii2 `app\models\apifootball\FootballClient`
 * (`predifutbolapi/models/apifootball/src/Result.php` & `Data.php`).
 * Fetches fixtures from API-Football v3 on RapidAPI and caches/upserts them locally.
 */

require('dotenv').config();
const db = require('./db');

const API_BASE_URL = process.env.API_FOOTBALL_URL || 'https://api-football-v1.p.rapidapi.com/v3';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'api-football-v1.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'America/Bogota';

async function syncFixturesByDate(dateStr, timezone = DEFAULT_TIMEZONE) {
  if (!RAPIDAPI_KEY) {
    throw new Error('RAPIDAPI_KEY is not configured in .env');
  }

  const url = `${API_BASE_URL}/fixtures?date=${encodeURIComponent(dateStr)}&timezone=${encodeURIComponent(timezone)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Host': RAPIDAPI_HOST,
      'X-RapidAPI-Key': RAPIDAPI_KEY
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API-Football HTTP ${response.status}: ${text}`);
  }

  const data = await response.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    const errMsg = typeof data.errors === 'object' ? JSON.stringify(data.errors) : String(data.errors);
    throw new Error(`API-Football error: ${errMsg}`);
  }

  const items = data.response || [];
  const totalSaved = await db.saveSyncedFixtures(items);

  return {
    fetched: items.length,
    totalCached: totalSaved,
    date: dateStr,
    timezone
  };
}

module.exports = {
  syncFixturesByDate
};
