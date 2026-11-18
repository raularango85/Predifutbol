/**
 * services/db.js
 *
 * Unified data access layer for PrediFutbol Local Engine.
 * Uses PostgreSQL (`pg` Pool) when connected, and automatically falls back to
 * the extracted Yii2 seed cache (`db/yii2-seed-cache.json`) + persistent local JSON
 * (`db/local-store.json`) if PostgreSQL is offline or unconfigured.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const tiktokService = require('./tiktokService');
const { formatMarketPick, isGenericMarketName } = require('./marketFormatter');
const { translateTeamName } = require('./teamTranslator');

const SEED_CACHE_PATH = path.join(__dirname, '..', 'db', 'yii2-seed-cache.json');
const LOCAL_STORE_PATH = path.join(__dirname, '..', 'db', 'local-store.json');

let pool = null;
let pgAvailable = false;
let seedCache = null;
let localStore = null;

// Initial default presets saved in local store if empty
const DEFAULT_PREDICTIONS = [
  {
    id: 1,
    fixture_id: null,
    league_id: 39,
    league_name: 'PREMIER LEAGUE',
    league_logo: 'https://media.api-sports.io/football/leagues/39.png',
    home_team_id: 40,
    home_name: 'LIVERPOOL',
    home_flag: 'https://media.api-sports.io/football/teams/40.png',
    away_team_id: 42,
    away_name: 'ARSENAL',
    away_flag: 'https://media.api-sports.io/football/teams/42.png',
    stadium: 'Anfield, Liverpool',
    match_date_text: 'SAT, NOV 8 • 17:30 GMT',
    type_prediction_id: 9,
    prediction_value: 'YES',
    custom_pick_en: 'BOTH TEAMS TO SCORE (YES)',
    custom_pick_es: 'AMBOS EQUIPOS MARCAN (SÍ)',
    odd: 1.72,
    stake_bet: 8,
    probability: 68,
    is_vip: false,
    was_right: 2,
    stats_en: [
      '⚡ H2H: Both teams scored in 4 of last 5 games',
      '🔥 Home Form: Liverpool avg 2.4 goals / match',
      '🛡️ Away Form: Arsenal scored in 90% of away games'
    ],
    stats_es: [
      '⚡ H2H: Ambos anotaron en 4 de los últimos 5 duelos',
      '🔥 Local: Liverpool promedia 2.4 goles / partido',
      '🛡️ Visita: Arsenal anotó en el 90% de salidas'
    ],
    theme: 'emerald',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    fixture_id: null,
    league_id: 140,
    league_name: 'EL CLÁSICO • LA LIGA',
    league_logo: 'https://media.api-sports.io/football/leagues/140.png',
    home_team_id: 541,
    home_name: 'REAL MADRID',
    home_flag: 'https://media.api-sports.io/football/teams/541.png',
    away_team_id: 529,
    away_name: 'BARCELONA',
    away_flag: 'https://media.api-sports.io/football/teams/529.png',
    stadium: 'Santiago Bernabéu, Madrid',
    match_date_text: 'SUN, NOV 16 • 20:00 CET',
    type_prediction_id: 3,
    prediction_value: '2.5',
    custom_pick_en: 'OVER 2.5 MATCH GOALS',
    custom_pick_es: 'PARTIDO MÁS DE 2.5 GOLES',
    odd: 1.65,
    stake_bet: 9,
    probability: 78,
    is_vip: true,
    was_right: 2,
    stats_en: [
      '⚽ Over 2.5 goals in 8 of last 10 Clásicos',
      '⚡ Real Madrid unbeaten in last 12 home matches',
      '🔥 Barça scored 2+ goals in 6 consecutive games'
    ],
    stats_es: [
      '⚽ Más de 2.5 goles en 8 de los últimos 10 Clásicos',
      '⚡ Real Madrid invicto en sus últimos 12 juegos en casa',
      '🔥 Barça anotó 2+ goles en 6 partidos seguidos'
    ],
    theme: 'amber',
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    fixture_id: null,
    league_id: 239,
    league_name: 'LIGA BETPLAY • COLOMBIA',
    league_logo: 'https://media.api-sports.io/football/leagues/239.png',
    home_team_id: 1125,
    home_name: 'MILLONARIOS',
    home_flag: 'https://media.api-sports.io/football/teams/1125.png',
    away_team_id: 1137,
    away_name: 'ATLETICO NACIONAL',
    away_flag: 'https://media.api-sports.io/football/teams/1137.png',
    stadium: 'Estadio Nemesio Camacho El Campín, Bogotá, D.C.',
    match_date_text: 'DOM, NOV 9 • 19:30 COL',
    type_prediction_id: 1,
    prediction_value: '1X',
    custom_pick_en: 'HOME OR DRAW (1X) & +1.5 GOALS',
    custom_pick_es: 'LOCAL O EMPATE (1X) Y +1.5 GOLES',
    odd: 1.80,
    stake_bet: 8,
    probability: 74,
    is_vip: false,
    was_right: 2,
    stats_en: [
      '⚡ H2H: Classic rivalry with goals in 5 straight meetings',
      '🔥 Home Form: Millonarios won 7 of last 8 at El Campín',
      '🛡️ Away Form: Nacional averages 1.5 goals on the road'
    ],
    stats_es: [
      '⚡ H2H: Superclásico con goles en 5 duelos seguidos',
      '🔥 Local: Millonarios ganó 7 de sus últimos 8 en El Campín',
      '🛡️ Visita: Nacional promedia 1.5 goles fuera de casa'
    ],
    theme: 'cyan',
    created_at: new Date().toISOString()
  }
];

function loadFallbackData() {
  if (!seedCache) {
    if (fs.existsSync(SEED_CACHE_PATH)) {
      seedCache = JSON.parse(fs.readFileSync(SEED_CACHE_PATH, 'utf8'));
    } else {
      const { extractFromYii2Files } = require('../db/seed-from-yii2');
      seedCache = extractFromYii2Files();
    }
    // Index venues and countries for fast O(1) joins
    seedCache.venuesById = new Map(seedCache.venues.map(v => [v.id, v]));
    seedCache.countriesById = new Map(seedCache.countries.map(c => [c.id, c]));
    seedCache.countriesByName = new Map(seedCache.countries.map(c => [String(c.name).toLowerCase(), c]));
    seedCache.teamsById = new Map(seedCache.teams.map(t => [t.id, t]));
    seedCache.leaguesById = new Map(seedCache.leagues.map(l => [l.id, l]));
  }

  if (!localStore) {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      try {
        localStore = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, 'utf8'));
      } catch (e) {
        localStore = { predictions: [...DEFAULT_PREDICTIONS], fixtures: [] };
      }
    } else {
      localStore = { predictions: [...DEFAULT_PREDICTIONS], fixtures: [] };
      // Also pre-load sample fixtures from predifutbolapi/web/fixtures.json if present
      const fixturesJsonPath = path.join(__dirname, '..', 'predifutbolapi', 'web', 'fixtures.json');
      if (fs.existsSync(fixturesJsonPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(fixturesJsonPath, 'utf8'));
          localStore.fixtures = (raw.response || []).slice(0, 80).map(item => ({
            id: item.fixture.id,
            date: item.fixture.date,
            timestamp: item.fixture.timestamp,
            timezone: item.fixture.timezone,
            venue_name: item.fixture.venue ? item.fixture.venue.name : null,
            venue_city: item.fixture.venue ? item.fixture.venue.city : null,
            status_short: item.fixture.status ? item.fixture.status.short : 'NS',
            league_id: item.league.id,
            league_name: item.league.name,
            league_country: item.league.country,
            league_logo: item.league.logo,
            home_id: item.teams.home.id,
            home_name: item.teams.home.name,
            home_logo: item.teams.home.logo,
            away_id: item.teams.away.id,
            away_name: item.teams.away.name,
            away_logo: item.teams.away.logo
          }));
        } catch (err) {
          // ignore
        }
      }
      saveLocalStore();
    }
  }
}

function saveLocalStore() {
  if (localStore) {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(localStore, null, 2), 'utf8');
  }
}

async function initDb() {
  loadFallbackData();

  pool = new Pool({
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'predifutbol',
    connectionTimeoutMillis: 2500
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    pgAvailable = true;
    console.log('✅ Connected to PostgreSQL database:', process.env.PGDATABASE || 'predifutbol');
  } catch (err) {
    pgAvailable = false;
    console.log('ℹ️ PostgreSQL not reachable on port', process.env.PGPORT || 5432, '— running with Yii2 Seed Cache + Local Store (6,139 teams, 2,929 venues, 941 leagues).');
  }
}

function getStatus() {
  loadFallbackData();
  return {
    engine: pgAvailable ? 'PostgreSQL' : 'Yii2-Seed-Cache + JSON Store',
    pgAvailable,
    counts: {
      countries: seedCache.countries.length,
      leagues: seedCache.leagues.length,
      teams: seedCache.teams.length,
      venues: seedCache.venues.length,
      fixtures: (seedCache.fixtures || []).length,
      type_predictions: seedCache.type_predictions.length,
      saved_predictions: localStore.predictions.length
    }
  };
}

const PG_ACCENT_FROM = 'áàäâãéèëêíìïîóòöôõúùüûñçğşı';
const PG_ACCENT_TO   = 'aaaaaeeeeiiiiooooouuuuncgsi';

const SEARCH_ALIASES = {
  'turkey': ['turkiye', 'turquia'],
  'turquia': ['turkiye', 'turkey'],
  'turkiye': ['turkey', 'turquia'],
  'czech republic': ['czechia', 'republica checa'],
  'republica checa': ['czechia', 'czech republic'],
  'czechia': ['czech republic', 'republica checa'],
  'inglaterra': ['england'],
  'england': ['inglaterra'],
  'espana': ['spain'],
  'spain': ['espana'],
  'francia': ['france'],
  'france': ['francia'],
  'italia': ['italy'],
  'italy': ['italia'],
  'belgica': ['belgium'],
  'belgium': ['belgica'],
  'croacia': ['croatia'],
  'croatia': ['croacia'],
  'finlandia': ['finland'],
  'finland': ['finlandia'],
  'bielorrusia': ['belarus'],
  'belarus': ['bielorrusia'],
  'letonia': ['latvia'],
  'latvia': ['letonia'],
  'chipre': ['cyprus'],
  'cyprus': ['chipre'],
  'alemania': ['germany'],
  'germany': ['alemania'],
  'paises bajos': ['netherlands'],
  'holanda': ['netherlands'],
  'netherlands': ['paises bajos', 'holanda'],
  'suiza': ['switzerland'],
  'suecia': ['sweden'],
  'noruega': ['norway'],
  'dinamarca': ['denmark'],
  'grecia': ['greece'],
  'escocia': ['scotland'],
  'gales': ['wales'],
  'irlanda': ['ireland'],
  'marruecos': ['morocco'],
  'costa de marfil': ['ivory coast'],
  'brasil': ['brazil'],
  'estados unidos': ['usa'],
  'unl': ['uefa nations league', 'nations league'],
  'ucl': ['uefa champions league', 'champions league'],
  'uel': ['uefa europa league', 'europa league']
};

function pgNormalizeSql(exprSql) {
  return `TRANSLATE(LOWER(${exprSql}), '${PG_ACCENT_FROM}', '${PG_ACCENT_TO}')`;
}

function normalizeSearchText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .trim();
}

function buildSearchTokenGroups(rawQuery) {
  const norm = normalizeSearchText(rawQuery);
  if (!norm) return [];

  const sortedKeys = Object.keys(SEARCH_ALIASES).sort((a, b) => b.length - a.length);
  const groups = [];
  const parts = norm.split(/\s+(?:vs\.?|v|-)\s+/i).map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (SEARCH_ALIASES[part]) {
      groups.push(Array.from(new Set([part, ...SEARCH_ALIASES[part]])));
      continue;
    }
    let temp = part;
    for (const key of sortedKeys) {
      if (key.includes(' ') && temp.includes(key)) {
        groups.push(Array.from(new Set([key, ...SEARCH_ALIASES[key]])));
        temp = temp.replace(key, ' ').trim();
      }
    }
    const words = temp.split(/\s+/).filter(w => w && w !== 'vs' && w !== 'de' && w !== 'la');
    for (const w of words) {
      if (SEARCH_ALIASES[w]) {
        groups.push(Array.from(new Set([w, ...SEARCH_ALIASES[w]])));
      } else {
        groups.push([w]);
      }
    }
  }
  return groups;
}

function buildPgGroupsWhere(searchableSql, groups, params) {
  if (!groups || groups.length === 0) return 'TRUE';
  const andClauses = groups.map(variants => {
    const orClauses = variants.map(v => {
      params.push(`%${v}%`);
      return `${searchableSql} LIKE $${params.length}`;
    });
    return `(${orClauses.join(' OR ')})`;
  });
  return andClauses.join(' AND ');
}

function matchesTokenGroups(textFields, groups) {
  if (!groups || groups.length === 0) return true;
  const hay = normalizeSearchText(textFields.filter(Boolean).join(' '));
  return groups.every(variants => variants.some(v => hay.includes(v)));
}

function getTodayBogotaIso() {
  return new Date().toLocaleDateString('en-CA', { timeZone: process.env.DEFAULT_TIMEZONE || 'America/Bogota' });
}

async function searchTeams({ q = '', limit = 25 } = {}) {
  loadFallbackData();
  const term = String(q).trim().toLowerCase();
  const groups = buildSearchTokenGroups(q);

  if (pgAvailable) {
    try {
      const params = [];
      const searchableSql = pgNormalizeSql("COALESCE(t.name, '') || ' ' || COALESCE(t.country, '')");
      const qWhere = buildPgGroupsWhere(searchableSql, groups, params);
      params.push(Number(limit));
      const res = await pool.query(
        `SELECT t.id, t.name, t.country, t.logo, t.venue_id,
                v.name AS venue_name, v.city AS venue_city
         FROM teams t
         LEFT JOIN venues v ON v.id = t.venue_id
         WHERE ${qWhere}
         ORDER BY CASE WHEN t.venue_id IS NOT NULL THEN 0 ELSE 1 END, t.id ASC
         LIMIT $${params.length}`,
        params
      );
      return res.rows;
    } catch (e) {
      // fallback
    }
  }

  let results = seedCache.teams;
  if (groups.length > 0) {
    results = results.filter(t => matchesTokenGroups([t.name, t.country], groups));
    // Prioritize exact prefix matches and teams with venues
    results.sort((a, b) => {
      const aStarts = a.name && normalizeSearchText(a.name).startsWith(normalizeSearchText(term)) ? 0 : 1;
      const bStarts = b.name && normalizeSearchText(b.name).startsWith(normalizeSearchText(term)) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      const aHasVenue = a.venue_id ? 0 : 1;
      const bHasVenue = b.venue_id ? 0 : 1;
      if (aHasVenue !== bHasVenue) return aHasVenue - bHasVenue;
      return a.id - b.id;
    });
  } else {
    results = results.filter(t => t.venue_id !== null);
  }

  return results.slice(0, Number(limit)).map(t => {
    const venue = t.venue_id ? seedCache.venuesById.get(t.venue_id) : null;
    const countryObj = t.country ? seedCache.countriesByName.get(String(t.country).toLowerCase()) : null;
    return {
      id: t.id,
      name: t.name,
      country: t.country,
      country_flag: countryObj ? countryObj.flag : null,
      logo: t.logo,
      venue_id: t.venue_id,
      venue_name: venue ? venue.name : null,
      venue_city: venue ? venue.city : null
    };
  });
}

async function searchLeagues({ q = '', limit = 30 } = {}) {
  loadFallbackData();
  const groups = buildSearchTokenGroups(q);

  if (pgAvailable) {
    try {
      const params = [];
      const searchableSql = pgNormalizeSql("COALESCE(l.name, '') || ' ' || COALESCE(c.name, '')");
      const qWhere = buildPgGroupsWhere(searchableSql, groups, params);
      params.push(Number(limit));
      const res = await pool.query(
        `SELECT l.id, l.name, l.type, l.logo, c.name AS country_name, c.flag AS country_flag
         FROM leagues l
         LEFT JOIN countries c ON c.id = l.country_id
         WHERE ${qWhere}
         ORDER BY l.id ASC
         LIMIT $${params.length}`,
        params
      );
      return res.rows;
    } catch (e) {
      // fallback
    }
  }

  let results = seedCache.leagues;
  if (groups.length > 0) {
    results = results.filter(l => {
      const c = l.country_id ? seedCache.countriesById.get(l.country_id) : null;
      return matchesTokenGroups([l.name, c ? c.name : ''], groups);
    });
  }

  return results.slice(0, Number(limit)).map(l => {
    const c = l.country_id ? seedCache.countriesById.get(l.country_id) : null;
    return {
      id: l.id,
      name: l.name,
      type: l.type,
      logo: l.logo,
      country_name: c ? c.name : null,
      country_flag: c ? c.flag : null
    };
  });
}

async function getTypePredictions() {
  loadFallbackData();
  let rows = [];
  if (pgAvailable) {
    try {
      const res = await pool.query('SELECT * FROM type_predictions ORDER BY id ASC');
      if (res.rows.length > 0) rows = res.rows;
    } catch (e) {
      // fallback
    }
  }
  if (!rows || rows.length === 0) {
    rows = seedCache.type_predictions || [];
  }

  return rows.map(r => {
    let vals = r.valid_values;
    if (typeof vals === 'string') {
      try {
        vals = JSON.parse(vals);
      } catch (e) {
        vals = vals.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return {
      ...r,
      valid_values: Array.isArray(vals) && vals.length > 0 ? vals : ['YES', 'NO']
    };
  });
}

async function searchFixtures({ q = '', date = '', limit = 30, upcomingOnly = true } = {}) {
  loadFallbackData();
  const datePrefix = String(date).trim();
  const groups = buildSearchTokenGroups(q);
  const todayBogota = getTodayBogotaIso();
  const isUpcoming = String(upcomingOnly) !== 'false' && String(upcomingOnly) !== '0';
  const nowEpoch = Math.floor(Date.now() / 1000) - 300; // 5 min grace window

  if (pgAvailable) {
    try {
      const params = [datePrefix, `${datePrefix}%`, todayBogota];
      const searchableSql = pgNormalizeSql(
        "COALESCE(th.name, '') || ' ' || COALESCE(ta.name, '') || ' ' || COALESCE(l.name, '') || ' ' || COALESCE(c.name, '') || ' ' || COALESCE(th.country, '')"
      );
      const qWhere = buildPgGroupsWhere(searchableSql, groups, params);

      let upcomingWhere = 'TRUE';
      if (isUpcoming) {
        params.push(nowEpoch);
        upcomingWhere = `(
          (f.timestamp IS NOT NULL AND f.timestamp >= $${params.length}) OR
          (f.timestamp IS NULL AND f.date >= (NOW() AT TIME ZONE 'America/Bogota') - INTERVAL '5 minutes')
        )`;
      }

      params.push(Number(limit));
      const limitParam = `$${params.length}`;

      const res = await pool.query(
        `SELECT f.id,
                f.date,
                f.timestamp,
                f.timezone,
                f.referee,
                f.goal_home,
                f.goal_away,
                COALESCE(f.venue_name, v.name) AS venue_name,
                COALESCE(f.venue_city, v.city) AS venue_city,
                COALESCE(fs.short, 'NS') AS status_short,
                f.league_id,
                l.name AS league_name,
                l.logo AS league_logo,
                COALESCE(c.name, th.country) AS league_country,
                f.team_home_id AS home_id,
                th.name AS home_name,
                th.logo AS home_logo,
                f.team_away_id AS away_id,
                ta.name AS away_name,
                ta.logo AS away_logo
         FROM fixtures f
         JOIN teams th ON th.id = f.team_home_id
         JOIN teams ta ON ta.id = f.team_away_id
         JOIN leagues l ON l.id = f.league_id
         LEFT JOIN countries c ON c.id = l.country_id
         LEFT JOIN venues v ON v.id = COALESCE(f.venue_id, th.venue_id)
         LEFT JOIN fixtures_status fs ON fs.id = f.status_id
         WHERE ($1 = '' OR TO_CHAR(f.date, 'YYYY-MM-DD') LIKE $2)
           AND (${qWhere})
           AND (${upcomingWhere})
         ORDER BY
           CASE WHEN TO_CHAR(f.date, 'YYYY-MM-DD') >= $3 THEN 0 ELSE 1 END ASC,
           CASE WHEN TO_CHAR(f.date, 'YYYY-MM-DD') >= $3 THEN f.date ELSE NULL END ASC NULLS LAST,
           f.date DESC NULLS LAST,
           CASE WHEN COALESCE(f.venue_name, v.name) IS NOT NULL THEN 0 ELSE 1 END ASC
         LIMIT ${limitParam}`,
        params
      );
      return res.rows.map(r => ({
        ...r,
        home_name_es: translateTeamName(r.home_name, 'es'),
        away_name_es: translateTeamName(r.away_name, 'es')
      }));
    } catch (e) {
      console.warn('PG searchFixtures fallback:', e.message);
    }
  }

  // Fallback: merge seedCache.fixtures (hydrated with team/league names) + localStore.fixtures
  const hydratedSeed = (seedCache.fixtures || []).map(f => {
    const th = seedCache.teamsById.get(f.team_home_id) || {};
    const ta = seedCache.teamsById.get(f.team_away_id) || {};
    const lg = seedCache.leaguesById.get(f.league_id) || {};
    const c = lg.country_id ? seedCache.countriesById.get(lg.country_id) : null;
    const v = (f.venue_id && seedCache.venuesById.get(f.venue_id)) || (th.venue_id && seedCache.venuesById.get(th.venue_id)) || null;
    return {
      id: f.id,
      date: f.date,
      timestamp: f.timestamp,
      timezone: f.timezone,
      venue_name: f.venue_name || (v ? v.name : null),
      venue_city: f.venue_city || (v ? v.city : null),
      status_short: 'NS',
      league_id: f.league_id,
      league_name: lg.name || '',
      league_country: (c && c.name) || th.country || null,
      league_logo: lg.logo || null,
      home_id: f.team_home_id,
      home_name: th.name || '',
      home_logo: th.logo || null,
      away_id: f.team_away_id,
      away_name: ta.name || '',
      away_logo: ta.logo || null
    };
  });

  const combinedMap = new Map();
  for (const item of hydratedSeed) combinedMap.set(item.id, item);
  for (const item of localStore.fixtures || []) combinedMap.set(item.id, item);

  let list = Array.from(combinedMap.values());
  if (datePrefix) {
    list = list.filter(f => f.date && String(f.date).startsWith(datePrefix));
  }
  if (isUpcoming) {
    list = list.filter(f => {
      if (f.timestamp) return Number(f.timestamp) >= nowEpoch;
      if (f.date) return new Date(f.date).getTime() >= (Date.now() - 300000);
      return true;
    });
  }
  if (groups.length > 0) {
    list = list.filter(f =>
      matchesTokenGroups([f.home_name, f.away_name, f.league_name, f.league_country], groups)
    );
  }
  list.sort((a, b) => {
    const aDateStr = String(a.date || '').slice(0, 10);
    const bDateStr = String(b.date || '').slice(0, 10);
    const aUp = aDateStr >= todayBogota ? 0 : 1;
    const bUp = bDateStr >= todayBogota ? 0 : 1;
    if (aUp !== bUp) return aUp - bUp;
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return aUp === 0 ? aTime - bTime : bTime - aTime;
  });
  return list.slice(0, Number(limit)).map(r => ({
    ...r,
    home_name_es: translateTeamName(r.home_name, 'es'),
    away_name_es: translateTeamName(r.away_name, 'es')
  }));
}

async function saveSyncedFixtures(apiFixtures) {
  loadFallbackData();
  const existingById = new Map((localStore.fixtures || []).map(f => [f.id, f]));

  const trunc = (val, max) => (val ? String(val).slice(0, max) : null);

  for (const item of apiFixtures) {
    const rawVenueId = item.fixture && item.fixture.venue ? Number(item.fixture.venue.id) : 0;
    const safeVenueId = Number.isFinite(rawVenueId) && rawVenueId > 0 ? rawVenueId : null;

    const mapped = {
      id: item.fixture.id,
      date: item.fixture.date,
      timestamp: item.fixture.timestamp,
      timezone: item.fixture.timezone,
      venue_id: safeVenueId,
      venue_name: item.fixture.venue ? item.fixture.venue.name : null,
      venue_city: item.fixture.venue ? item.fixture.venue.city : null,
      status_short: item.fixture.status ? item.fixture.status.short : 'NS',
      league_id: item.league.id,
      league_name: item.league.name,
      league_country: item.league.country,
      league_logo: item.league.logo,
      home_id: item.teams.home.id,
      home_name: item.teams.home.name,
      home_logo: item.teams.home.logo,
      away_id: item.teams.away.id,
      away_name: item.teams.away.name,
      away_logo: item.teams.away.logo
    };
    existingById.set(mapped.id, mapped);

    if (pgAvailable) {
      try {
        if (mapped.venue_id) {
          await pool.query(
            `INSERT INTO venues (id, name, city) VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name, ''), venues.name), city = COALESCE(EXCLUDED.city, venues.city)`,
            [mapped.venue_id, trunc(mapped.venue_name, 255) || 'Estadio por confirmar', trunc(mapped.venue_city, 120)]
          );
        }
        await pool.query(
          `INSERT INTO leagues (id, name, type, logo) VALUES ($1, $2, 'League', $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo = COALESCE(EXCLUDED.logo, leagues.logo)`,
          [mapped.league_id, trunc(mapped.league_name, 150) || 'League', trunc(mapped.league_logo, 255) || '']
        );
        await pool.query(
          `INSERT INTO teams (id, name, country, logo, venue_id) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo = COALESCE(EXCLUDED.logo, teams.logo), venue_id = COALESCE(teams.venue_id, EXCLUDED.venue_id)`,
          [mapped.home_id, trunc(mapped.home_name, 120) || 'Home', trunc(mapped.league_country, 120), trunc(mapped.home_logo, 255), mapped.venue_id]
        );
        await pool.query(
          `INSERT INTO teams (id, name, country, logo) VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo = COALESCE(EXCLUDED.logo, teams.logo)`,
          [mapped.away_id, trunc(mapped.away_name, 120) || 'Away', trunc(mapped.league_country, 120), trunc(mapped.away_logo, 255)]
        );
        await pool.query(
          `INSERT INTO fixtures (
             id, referee, timezone, date, timestamp, venue_id, venue_name, venue_city,
             goal_home, goal_away, team_home_id, team_away_id, league_id, status_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 2)
           ON CONFLICT (id) DO UPDATE SET
             date = EXCLUDED.date,
             timestamp = EXCLUDED.timestamp,
             venue_id = COALESCE(EXCLUDED.venue_id, fixtures.venue_id),
             venue_name = COALESCE(EXCLUDED.venue_name, fixtures.venue_name),
             venue_city = COALESCE(EXCLUDED.venue_city, fixtures.venue_city)`,
          [
            mapped.id,
            trunc(item.fixture.referee, 120),
            trunc(mapped.timezone, 50) || 'America/Bogota',
            mapped.date || null,
            mapped.timestamp || null,
            mapped.venue_id,
            trunc(mapped.venue_name, 255),
            trunc(mapped.venue_city, 120),
            item.goals ? item.goals.home : null,
            item.goals ? item.goals.away : null,
            mapped.home_id,
            mapped.away_id,
            mapped.league_id
          ]
        );
      } catch (e) {
        console.warn('PG saveSyncedFixtures item error:', mapped.id, e.message);
      }
    }
  }

  localStore.fixtures = Array.from(existingById.values());
  saveLocalStore();
  return localStore.fixtures.length;
}

function enrichWithTikTok(pred) {
  if (!pred) return pred;
  if (!pred.tiktok_caption || !pred.tiktok_hashtags || tiktokService.isTikTokContentMismatched(pred, pred.tiktok_caption, pred.tiktok_hashtags)) {
    const generated = tiktokService.generateTikTokContent(pred);
    pred.tiktok_caption = generated.caption;
    pred.tiktok_hashtags = generated.hashtags;
  }
  pred.tiktok_full_text = `${pred.tiktok_caption || ''}\n\n${pred.tiktok_hashtags || ''}`.trim();
  return pred;
}

async function getPredictions({ page = 1, limit = 10, search = '' } = {}) {
  loadFallbackData();
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
  const offset = (pageNum - 1) * limitNum;
  const qClean = (search || '').trim();

  if (pgAvailable) {
    try {
      let countQuery = 'SELECT COUNT(*) as total FROM predictions';
      let dataQuery = 'SELECT * FROM predictions';
      const params = [];

      if (qClean) {
        countQuery += ` WHERE home_name ILIKE $1 OR away_name ILIKE $1 OR league_name ILIKE $1 OR custom_pick_es ILIKE $1 OR custom_pick_en ILIKE $1`;
        dataQuery += ` WHERE home_name ILIKE $1 OR away_name ILIKE $1 OR league_name ILIKE $1 OR custom_pick_es ILIKE $1 OR custom_pick_en ILIKE $1`;
        params.push(`%${qClean}%`);
      }

      dataQuery += ` ORDER BY COALESCE(match_date, created_at) DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      
      const countRes = await pool.query(countQuery, params);
      const total = parseInt(countRes.rows[0]?.total || 0, 10);
      
      const dataRes = await pool.query(dataQuery, [...params, limitNum, offset]);
      return {
        results: dataRes.rows.map(enrichWithTikTok),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      };
    } catch (e) {
      console.warn('PG getPredictions error, falling back to localStore:', e.message);
    }
  }

  let list = localStore.predictions || [];
  if (qClean) {
    const qLower = qClean.toLowerCase();
    list = list.filter(p =>
      (p.home_name && p.home_name.toLowerCase().includes(qLower)) ||
      (p.away_name && p.away_name.toLowerCase().includes(qLower)) ||
      (p.league_name && p.league_name.toLowerCase().includes(qLower)) ||
      (p.custom_pick_es && p.custom_pick_es.toLowerCase().includes(qLower)) ||
      (p.custom_pick_en && p.custom_pick_en.toLowerCase().includes(qLower))
    );
  }
  const total = list.length;
  const paginated = list.slice(offset, offset + limitNum).map(enrichWithTikTok);
  return {
    results: paginated,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1
  };
}

async function getPredictionById(id) {
  loadFallbackData();
  const numId = Number(id);
  if (pgAvailable) {
    try {
      const res = await pool.query('SELECT * FROM predictions WHERE id = $1', [numId]);
      if (res.rows[0]) return enrichWithTikTok(res.rows[0]);
    } catch (e) {
      // fallback
    }
  }
  const found = localStore.predictions.find(p => Number(p.id) === numId);
  return found ? enrichWithTikTok(found) : null;
}

async function savePrediction(payload) {
  loadFallbackData();

  // If updating existing prediction, check if the match date has already passed
  if (payload.id) {
    const existing = await getPredictionById(payload.id);
    if (existing && existing.match_date) {
      const matchTime = new Date(existing.match_date).getTime();
      if (!isNaN(matchTime) && matchTime < Date.now()) {
        throw new Error('No es posible modificar esta predicción porque la hora del partido ya ha pasado.');
      }
    }
  }

  const record = {
    id: payload.id ? Number(payload.id) : null,
    fixture_id: payload.fixture_id ? Number(payload.fixture_id) : null,
    league_id: payload.league_id ? Number(payload.league_id) : null,
    league_name: payload.league_name || 'PREMIER LEAGUE',
    league_logo: payload.league_logo || null,
    home_team_id: payload.home_team_id ? Number(payload.home_team_id) : null,
    home_name: payload.home_name || 'HOME',
    home_flag: payload.home_flag || '⚽',
    away_team_id: payload.away_team_id ? Number(payload.away_team_id) : null,
    away_name: payload.away_name || 'AWAY',
    away_flag: payload.away_flag || '⚽',
    stadium: payload.stadium || '',
    match_date_text: payload.match_date_text || '',
    match_date: payload.match_date ? new Date(payload.match_date).toISOString() : null,
    type_prediction_id: payload.type_prediction_id ? Number(payload.type_prediction_id) : 9,
    prediction_value: payload.prediction_value || 'YES',
    custom_pick_en: payload.custom_pick_en || '',
    custom_pick_es: payload.custom_pick_es || '',
    odd: payload.odd ? Number(payload.odd) : 1.75,
    stake_bet: payload.stake_bet ? Number(payload.stake_bet) : 8,
    probability: payload.probability ? Number(payload.probability) : 70,
    is_vip: Boolean(payload.is_vip),
    was_right: payload.was_right !== undefined ? Number(payload.was_right) : 2,
    stats_en: Array.isArray(payload.stats_en) ? payload.stats_en : [],
    stats_es: Array.isArray(payload.stats_es) ? payload.stats_es : [],
    tiktok_caption: payload.tiktok_caption || null,
    tiktok_hashtags: payload.tiktok_hashtags || null,
    theme: payload.theme || 'emerald',
    created_at: payload.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // If pick text is missing or generic (e.g. just "Clásico"), compute actual prediction label
  if (!record.custom_pick_es || isGenericMarketName(record.custom_pick_es)) {
    const formatted = formatMarketPick(
      record.type_prediction_id,
      record.prediction_value
    );
    record.custom_pick_es = formatted.es;
    if (!record.custom_pick_en || isGenericMarketName(record.custom_pick_en)) {
      record.custom_pick_en = formatted.en;
    }
  }

  // Auto-generate or re-sync TikTok caption and hashtags if missing or mismatched
  if (!record.tiktok_caption || !record.tiktok_hashtags || tiktokService.isTikTokContentMismatched(record, record.tiktok_caption, record.tiktok_hashtags)) {
    const generated = tiktokService.generateTikTokContent(record);
    record.tiktok_caption = generated.caption;
    record.tiktok_hashtags = generated.hashtags;
  }
  record.tiktok_full_text = `${record.tiktok_caption}\n\n${record.tiktok_hashtags}`.trim();

  if (pgAvailable) {
    try {
      if (record.id) {
        // UPDATE existing prediction
        const res = await pool.query(
          `UPDATE predictions SET
            fixture_id = $1, league_id = $2, league_name = $3, league_logo = $4,
            home_team_id = $5, home_name = $6, home_flag = $7,
            away_team_id = $8, away_name = $9, away_flag = $10,
            stadium = $11, match_date_text = $12, match_date = $13,
            type_prediction_id = $14, prediction_value = $15,
            custom_pick_en = $16, custom_pick_es = $17,
            odd = $18, stake_bet = $19, probability = $20,
            is_vip = $21, was_right = $22,
            stats_en = $23, stats_es = $24, theme = $25,
            tiktok_caption = $26, tiktok_hashtags = $27,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $28 RETURNING *`,
          [
            record.fixture_id, record.league_id, record.league_name, record.league_logo,
            record.home_team_id, record.home_name, record.home_flag,
            record.away_team_id, record.away_name, record.away_flag,
            record.stadium, record.match_date_text, record.match_date,
            record.type_prediction_id, record.prediction_value,
            record.custom_pick_en, record.custom_pick_es,
            record.odd, record.stake_bet, record.probability,
            record.is_vip, record.was_right,
            JSON.stringify(record.stats_en), JSON.stringify(record.stats_es),
            record.theme, record.tiktok_caption, record.tiktok_hashtags, record.id
          ]
        );
        if (res.rows[0]) record.id = res.rows[0].id;
      } else {
        // INSERT new prediction
        const res = await pool.query(
          `INSERT INTO predictions (
            fixture_id, league_id, league_name, league_logo,
            home_team_id, home_name, home_flag,
            away_team_id, away_name, away_flag,
            stadium, match_date_text, match_date,
            type_prediction_id, prediction_value, custom_pick_en, custom_pick_es,
            odd, stake_bet, probability, is_vip, was_right,
            stats_en, stats_es, theme, tiktok_caption, tiktok_hashtags
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
          ) RETURNING *`,
          [
            record.fixture_id, record.league_id, record.league_name, record.league_logo,
            record.home_team_id, record.home_name, record.home_flag,
            record.away_team_id, record.away_name, record.away_flag,
            record.stadium, record.match_date_text, record.match_date,
            record.type_prediction_id, record.prediction_value,
            record.custom_pick_en, record.custom_pick_es,
            record.odd, record.stake_bet, record.probability,
            record.is_vip, record.was_right,
            JSON.stringify(record.stats_en), JSON.stringify(record.stats_es),
            record.theme, record.tiktok_caption, record.tiktok_hashtags
          ]
        );
        if (res.rows[0]) record.id = res.rows[0].id;
      }
    } catch (e) {
      console.warn('PG savePrediction error, falling back to localStore:', e.message);
    }
  }

  if (!record.id) record.id = Date.now();

  const idx = localStore.predictions.findIndex(p => Number(p.id) === Number(record.id));
  if (idx >= 0) {
    localStore.predictions[idx] = record;
  } else {
    localStore.predictions.unshift(record);
  }
  saveLocalStore();
  return record;
}

async function deletePrediction(id) {
  loadFallbackData();
  const numId = Number(id);
  if (pgAvailable) {
    try {
      await pool.query('DELETE FROM predictions WHERE id = $1', [numId]);
    } catch (e) {
      // ignore
    }
  }
  localStore.predictions = localStore.predictions.filter(p => Number(p.id) !== numId);
  saveLocalStore();
  return true;
}

module.exports = {
  initDb,
  getStatus,
  searchTeams,
  searchLeagues,
  getTypePredictions,
  searchFixtures,
  saveSyncedFixtures,
  getPredictions,
  getPredictionById,
  savePrediction,
  deletePrediction
};
