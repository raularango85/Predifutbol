/**
 * db/seed-from-yii2.js
 *
 * Extracts countries, venues, leagues, seasons, teams, fixtures_status, and type_predictions
 * from the legacy Yii2 database dump (predifutbolapi/migrations/predifutbol.sql) and JSON caches
 * (predifutbolapi/web/*.json), saves a fast local JSON seed cache (db/yii2-seed-cache.json),
 * and populates the PostgreSQL `predifutbol` database when available.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const SQL_PATH = path.join(__dirname, '..', 'predifutbolapi', 'migrations', 'predifutbol.sql');
const MIGRATION_SQL_PATH = path.join(__dirname, 'migration.sql');
const CACHE_JSON_PATH = path.join(__dirname, 'yii2-seed-cache.json');

// English labels for the 25 Yii2 type_predictions
const TYPE_PREDICTIONS_EN = {
  1: 'Full Time Result (1X2)',
  2: 'Correct Score',
  3: 'Match Over X Goals',
  4: 'Match Under X Goals',
  5: 'Home Team Over X Goals',
  6: 'Home Team Under X Goals',
  7: 'Away Team Under X Goals',
  8: 'Away Team Over X Goals',
  9: 'Both Teams To Score (BTTS)',
  10: 'Match Over X Corners',
  11: 'Match Under X Corners',
  12: 'Match Over X Yellow Cards',
  13: 'Match Under X Yellow Cards',
  14: 'Asian Handicap (Home)',
  15: 'Asian Handicap (Away)',
  16: 'Asian Handicap (Total)',
  17: '1st Half Result (1X2)',
  18: '2nd Half Result (1X2)',
  19: '1st Half Over X Goals',
  20: '1st Half Under X Goals',
  21: '1st Half Over X Goals',
  22: '1st Half Under X Goals',
  23: 'Total Shots on Target (Match)',
  24: 'Home Team Shots on Target',
  25: 'Away Team Shots on Target'
};

// English labels for fixtures_status
const STATUS_EN = {
  TBD: 'Time To Be Defined',
  NS: 'Not Started',
  '1H': 'First Half',
  HT: 'Halftime',
  '2H': 'Second Half',
  ET: 'Extra Time',
  P: 'Penalty In Progress',
  FT: 'Match Finished',
  AET: 'Match Finished After Extra Time',
  PEN: 'Match Finished After Penalty',
  BT: 'Break Time (in Extra Time)',
  SUSP: 'Match Suspended',
  INT: 'Match Interrupted',
  PST: 'Match Postponed',
  CANC: 'Match Cancelled',
  ABD: 'Match Abandoned',
  AWD: 'Technical Loss',
  WO: 'WalkOver',
  LIVE: 'In Progress'
};

// Top club home venue enrichments (for teams whose venue_id was NULL in fixture-only Yii2 imports)
const TOP_CLUB_VENUES = {
  33: { id: 556, name: 'Old Trafford', city: 'Manchester', country: 'England' },
  34: { id: 562, name: "St. James' Park", city: 'Newcastle upon Tyne', country: 'England' },
  39: { id: 600, name: 'Molineux Stadium', city: 'Wolverhampton', country: 'England' },
  40: { id: 550, name: 'Anfield', city: 'Liverpool', country: 'England' },
  42: { id: 494, name: 'Emirates Stadium', city: 'London', country: 'England' },
  45: { id: 8560, name: 'Goodison Park', city: 'Liverpool', country: 'England' },
  47: { id: 593, name: 'Tottenham Hotspur Stadium', city: 'London', country: 'England' },
  48: { id: 598, name: 'London Stadium', city: 'London', country: 'England' },
  49: { id: 519, name: 'Stamford Bridge', city: 'London', country: 'England' },
  50: { id: 555, name: 'Etihad Stadium', city: 'Manchester', country: 'England' },
  51: { id: 508, name: 'Amex Stadium', city: 'Falmer', country: 'England' },
  66: { id: 495, name: 'Villa Park', city: 'Birmingham', country: 'England' },
  85: { id: 671, name: 'Parc des Princes', city: 'Paris', country: 'France' },
  157: { id: 700, name: 'Allianz Arena', city: 'Munich', country: 'Germany' },
  165: { id: 702, name: 'Signal Iduna Park', city: 'Dortmund', country: 'Germany' },
  168: { id: 699, name: 'BayArena', city: 'Leverkusen', country: 'Germany' },
  489: { id: 907, name: 'San Siro (Giuseppe Meazza)', city: 'Milan', country: 'Italy' },
  492: { id: 11904, name: 'Stadio Diego Armando Maradona', city: 'Naples', country: 'Italy' },
  496: { id: 909, name: 'Allianz Stadium', city: 'Turin', country: 'Italy' },
  497: { id: 910, name: 'Stadio Olimpico', city: 'Rome', country: 'Italy' },
  505: { id: 907, name: 'San Siro (Giuseppe Meazza)', city: 'Milan', country: 'Italy' },
  529: { id: 1463, name: 'Spotify Camp Nou / Estadi Olímpic', city: 'Barcelona', country: 'Spain' },
  530: { id: 19217, name: 'Riyadh Air Metropolitano', city: 'Madrid', country: 'Spain' },
  536: { id: 1494, name: 'Estadio Ramón Sánchez Pizjuán', city: 'Seville', country: 'Spain' },
  541: { id: 1456, name: 'Santiago Bernabéu', city: 'Madrid', country: 'Spain' },
  435: { id: 31, name: 'Estadio Más Monumental', city: 'Buenos Aires', country: 'Argentina' },
  451: { id: 46, name: 'Estadio Alberto J. Armando (La Bombonera)', city: 'Buenos Aires', country: 'Argentina' }
};

/**
 * Parse a SQL VALUES tuple string like: (1, 'Name', NULL, 'Text\'s', 20)
 */
function parseSqlValuesTuple(tupleStr) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  let wasQuoted = false;

  for (let i = 0; i < tupleStr.length; i++) {
    const ch = tupleStr[i];
    if (inQuotes) {
      if (ch === '\\' && i + 1 < tupleStr.length) {
        current += tupleStr[i + 1];
        i++;
      } else if (ch === "'" && tupleStr[i + 1] === "'") {
        current += "'";
        i++;
      } else if (ch === "'") {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === "'") {
        inQuotes = true;
        wasQuoted = true;
        current = '';
      } else if (ch === ',') {
        fields.push(finalizeField(current, wasQuoted));
        current = '';
        wasQuoted = false;
      } else {
        current += ch;
      }
    }
  }
  fields.push(finalizeField(current, wasQuoted));
  return fields;
}

function finalizeField(raw, wasQuoted) {
  if (wasQuoted) return raw;
  const trimmed = raw.trim();
  if (trimmed.toUpperCase() === 'NULL' || trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isNaN(num) ? trimmed : num;
}

function extractFromYii2Files() {
  console.log('📖 Reading legacy Yii2 SQL dump:', SQL_PATH);
  const sqlContent = fs.readFileSync(SQL_PATH, 'utf8');
  const lines = sqlContent.split(/\r?\n/);

  const countriesMap = new Map();
  const venuesMap = new Map();
  const leaguesMap = new Map();
  const seasonsMap = new Map();
  const leaguesSeasonsList = [];
  const teamsMap = new Map();
  const statusMap = new Map();
  const fixturesMap = new Map();
  const typePredictionsMap = new Map();

  const insertRegex = /^INSERT INTO `(\w+)` VALUES \((.*)\);$/;

  for (const line of lines) {
    const match = line.match(insertRegex);
    if (!match) continue;
    const [, table, tuple] = match;
    const vals = parseSqlValuesTuple(tuple);

    switch (table) {
      case 'countries': {
        const [id, name, code, flag] = vals;
        countriesMap.set(id, { id, name, code, flag });
        break;
      }
      case 'venues': {
        const [id, name, address, city, capacity, surface, image] = vals;
        venuesMap.set(id, { id, name, address, city, capacity, surface, image });
        break;
      }
      case 'leagues': {
        const [id, name, type, logo, country_id] = vals;
        leaguesMap.set(id, { id, name, type, logo, country_id });
        break;
      }
      case 'seasons': {
        const [id, year] = vals;
        seasonsMap.set(id, { id, year });
        break;
      }
      case 'leagues_seasons': {
        const [league_id, season_id] = vals;
        leaguesSeasonsList.push({ league_id, season_id });
        break;
      }
      case 'teams': {
        const [id, name, country, founded, national, logo, country_id, venue_id] = vals;
        teamsMap.set(id, { id, name, country, founded, national, logo, country_id, venue_id });
        break;
      }
      case 'fixtures_status': {
        const [id, long_es, short] = vals;
        statusMap.set(id, {
          id,
          short,
          long_es,
          long_en: STATUS_EN[short] || long_es
        });
        break;
      }
      case 'fixtures': {
        const [
          id,
          referee,
          timezone,
          date,
          timestampStr,
          elapsed,
          goal_home,
          goal_away,
          team_home_id,
          team_away_id,
          league_id,
          status_id
        ] = vals;
        const tsNum = date ? Math.floor(new Date(date).getTime() / 1000) : null;
        fixturesMap.set(id, {
          id,
          referee,
          timezone: timezone || 'America/Bogota',
          date,
          timestamp: Number.isNaN(tsNum) ? null : tsNum,
          elapsed,
          venue_id: null,
          venue_name: null,
          venue_city: null,
          goal_home,
          goal_away,
          team_home_id,
          team_away_id,
          league_id,
          status_id: status_id || 2
        });
        break;
      }
      case 'type_predictions': {
        const [id, name, label_es, valid_values] = vals;
        typePredictionsMap.set(id, {
          id,
          name,
          label_es,
          label_en: TYPE_PREDICTIONS_EN[id] || label_es,
          valid_values
        });
        break;
      }
      default:
        break;
    }
  }

  // Enrich teams and venues from predifutbolapi/web/leagues_json.txt & teams.json & fixtures.json
  const webDir = path.join(__dirname, '..', 'predifutbolapi', 'web');
  for (const file of ['leagues_json.txt', 'teams.json']) {
    const filePath = path.join(webDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        for (const item of json.response || []) {
          if (item.venue && item.venue.id) {
            venuesMap.set(item.venue.id, {
              id: item.venue.id,
              name: item.venue.name,
              address: item.venue.address,
              city: item.venue.city,
              capacity: item.venue.capacity,
              surface: item.venue.surface,
              image: item.venue.image
            });
          }
          if (item.team && item.team.id) {
            const existing = teamsMap.get(item.team.id) || {};
            teamsMap.set(item.team.id, {
              id: item.team.id,
              name: item.team.name || existing.name,
              country: item.team.country || existing.country,
              founded: item.team.founded || existing.founded,
              national: item.team.national ? 1 : 2,
              logo: item.team.logo || existing.logo,
              country_id: existing.country_id || null,
              venue_id: (item.venue && item.venue.id) || existing.venue_id || null
            });
          }
        }
      } catch (e) {
        console.warn(`⚠️ Could not parse ${file}:`, e.message);
      }
    }
  }

  // Enrich from fixtures.json (links home team -> fixture venue + extracts extra fixtures)
  const statusShortToId = new Map();
  for (const s of statusMap.values()) {
    statusShortToId.set(s.short, s.id);
  }

  const fixturesJsonPath = path.join(webDir, 'fixtures.json');
  if (fs.existsSync(fixturesJsonPath)) {
    try {
      const json = JSON.parse(fs.readFileSync(fixturesJsonPath, 'utf8'));
      for (const item of json.response || []) {
        const f = item.fixture;
        const v = f && f.venue;
        const home = item.teams && item.teams.home;
        const away = item.teams && item.teams.away;
        const lg = item.league;

        if (v && v.id && v.name) {
          if (!venuesMap.has(v.id)) {
            venuesMap.set(v.id, {
              id: v.id,
              name: v.name,
              address: null,
              city: v.city || null,
              capacity: null,
              surface: null,
              image: null
            });
          }
          if (home && home.id && teamsMap.has(home.id)) {
            const t = teamsMap.get(home.id);
            if (!t.venue_id) t.venue_id = v.id;
            if (!t.country && lg && lg.country) {
              t.country = lg.country;
            }
          }
        }

        // Ensure teams and league exist if referenced by fixtures.json
        if (home && home.id && !teamsMap.has(home.id)) {
          teamsMap.set(home.id, {
            id: home.id,
            name: home.name || `Team ${home.id}`,
            country: (lg && lg.country) || null,
            founded: null,
            national: 2,
            logo: home.logo || null,
            country_id: null,
            venue_id: (v && v.id) || null
          });
        }
        if (away && away.id && !teamsMap.has(away.id)) {
          teamsMap.set(away.id, {
            id: away.id,
            name: away.name || `Team ${away.id}`,
            country: (lg && lg.country) || null,
            founded: null,
            national: 2,
            logo: away.logo || null,
            country_id: null,
            venue_id: null
          });
        }
        if (lg && lg.id && !leaguesMap.has(lg.id)) {
          leaguesMap.set(lg.id, {
            id: lg.id,
            name: lg.name || `League ${lg.id}`,
            type: 'League',
            logo: lg.logo || '',
            country_id: null
          });
        }

        if (f && f.id && home && home.id && away && away.id && lg && lg.id) {
          const existingFix = fixturesMap.get(f.id) || {};
          const shortCode = f.status && f.status.short ? f.status.short : 'NS';
          fixturesMap.set(f.id, {
            id: f.id,
            referee: f.referee || existingFix.referee || null,
            timezone: f.timezone || existingFix.timezone || 'America/Bogota',
            date: f.date || existingFix.date || null,
            timestamp: f.timestamp || existingFix.timestamp || null,
            elapsed: (f.status && f.status.elapsed) || existingFix.elapsed || null,
            venue_id: (v && v.id) || existingFix.venue_id || null,
            venue_name: (v && v.name) || existingFix.venue_name || null,
            venue_city: (v && v.city) || existingFix.venue_city || null,
            goal_home: item.goals && item.goals.home !== undefined ? item.goals.home : (existingFix.goal_home ?? null),
            goal_away: item.goals && item.goals.away !== undefined ? item.goals.away : (existingFix.goal_away ?? null),
            team_home_id: home.id,
            team_away_id: away.id,
            league_id: lg.id,
            status_id: statusShortToId.get(shortCode) || existingFix.status_id || 2
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not parse fixtures.json:', e.message);
    }
  }

  // Apply Top Club Venues enrichment
  for (const [teamIdStr, venueInfo] of Object.entries(TOP_CLUB_VENUES)) {
    const teamId = Number(teamIdStr);
    if (!venuesMap.has(venueInfo.id)) {
      venuesMap.set(venueInfo.id, {
        id: venueInfo.id,
        name: venueInfo.name,
        address: null,
        city: venueInfo.city,
        capacity: null,
        surface: 'grass',
        image: `https://media.api-sports.io/football/venues/${venueInfo.id}.png`
      });
    } else {
      const existingVenue = venuesMap.get(venueInfo.id);
      if (!existingVenue.name) existingVenue.name = venueInfo.name;
      if (!existingVenue.city) existingVenue.city = venueInfo.city;
    }

    if (teamsMap.has(teamId)) {
      const t = teamsMap.get(teamId);
      t.venue_id = venueInfo.id;
      if (!t.country) t.country = venueInfo.country;
    } else {
      teamsMap.set(teamId, {
        id: teamId,
        name: venueInfo.teamName || `Team ${teamId}`,
        country: venueInfo.country,
        founded: null,
        national: 2,
        logo: `https://media.api-sports.io/football/teams/${teamId}.png`,
        country_id: null,
        venue_id: venueInfo.id
      });
    }
  }

  // Enrich all fixtures with home team venue_id / venue_name / venue_city when missing
  for (const fix of fixturesMap.values()) {
    if (!fix.venue_id && fix.team_home_id && teamsMap.has(fix.team_home_id)) {
      const homeTeam = teamsMap.get(fix.team_home_id);
      if (homeTeam && homeTeam.venue_id) {
        fix.venue_id = homeTeam.venue_id;
      }
    }
    if (fix.venue_id && venuesMap.has(fix.venue_id)) {
      const vObj = venuesMap.get(fix.venue_id);
      if (!fix.venue_name) fix.venue_name = vObj.name || null;
      if (!fix.venue_city) fix.venue_city = vObj.city || null;
    }
  }

  const extracted = {
    countries: Array.from(countriesMap.values()),
    venues: Array.from(venuesMap.values()),
    leagues: Array.from(leaguesMap.values()),
    seasons: Array.from(seasonsMap.values()),
    leagues_seasons: leaguesSeasonsList,
    teams: Array.from(teamsMap.values()),
    fixtures_status: Array.from(statusMap.values()),
    fixtures: Array.from(fixturesMap.values()),
    type_predictions: Array.from(typePredictionsMap.values())
  };

  console.log(`✅ Extracted from Yii2 project:
  - Countries:        ${extracted.countries.length}
  - Venues/Stadiums:  ${extracted.venues.length}
  - Leagues:          ${extracted.leagues.length}
  - Seasons:          ${extracted.seasons.length}
  - Teams:            ${extracted.teams.length}
  - Fixture Statuses: ${extracted.fixtures_status.length}
  - Fixtures:         ${extracted.fixtures.length}
  - Prediction Types: ${extracted.type_predictions.length}`);

  fs.writeFileSync(CACHE_JSON_PATH, JSON.stringify(extracted, null, 2), 'utf8');
  console.log(`💾 Saved fast seed cache to ${CACHE_JSON_PATH}`);

  return extracted;
}

async function seedPostgres(data) {
  const dbName = process.env.PGDATABASE || 'predifutbol';
  const baseConfig = {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres'
  };

  // Step 1: Connect to default 'postgres' db to create 'predifutbol' if it doesn't exist
  const adminClient = new Client({ ...baseConfig, database: 'postgres' });
  try {
    await adminClient.connect();
    const res = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      console.log(`🛠️ Creating PostgreSQL database "${dbName}"...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
    }
    await adminClient.end();
  } catch (err) {
    console.warn(`⚠️ Could not connect to PostgreSQL (${err.message}).`);
    console.warn('👉 The app will automatically run using the extracted Yii2 JSON seed cache (db/yii2-seed-cache.json) until PG credentials in .env are updated.');
    return false;
  }

  // Step 2: Connect to 'predifutbol' and run migration + batch seed
  const client = new Client({ ...baseConfig, database: dbName });
  try {
    await client.connect();
    console.log(`🚀 Running db/migration.sql on PostgreSQL "${dbName}"...`);
    const migrationSql = fs.readFileSync(MIGRATION_SQL_PATH, 'utf8');
    await client.query(migrationSql);

    await client.query('BEGIN');

    // Countries
    for (const c of data.countries) {
      await client.query(
        `INSERT INTO countries (id, name, code, flag) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, flag = EXCLUDED.flag`,
        [c.id, c.name, c.code, c.flag]
      );
    }

    // Venues
    for (const v of data.venues) {
      await client.query(
        `INSERT INTO venues (id, name, address, city, capacity, surface, image)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET name = COALESCE(EXCLUDED.name, venues.name), city = COALESCE(EXCLUDED.city, venues.city)`,
        [v.id, v.name, v.address, v.city, v.capacity, v.surface, v.image]
      );
    }

    // Leagues
    const validCountryIds = new Set(data.countries.map(c => c.id));
    for (const l of data.leagues) {
      const countryId = validCountryIds.has(l.country_id) ? l.country_id : null;
      await client.query(
        `INSERT INTO leagues (id, name, type, logo, country_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo = EXCLUDED.logo`,
        [l.id, l.name, l.type || 'League', l.logo || '', countryId]
      );
    }

    // Seasons
    const validSeasonIds = new Set();
    for (const s of data.seasons || []) {
      validSeasonIds.add(s.id);
      await client.query(
        `INSERT INTO seasons (id, year) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET year = EXCLUDED.year`,
        [s.id, s.year]
      );
    }

    // Leagues Seasons
    const validLeagueIds = new Set(data.leagues.map(l => l.id));
    for (const ls of data.leagues_seasons || []) {
      if (validLeagueIds.has(ls.league_id) && validSeasonIds.has(ls.season_id)) {
        await client.query(
          `INSERT INTO leagues_seasons (league_id, season_id) VALUES ($1, $2)
           ON CONFLICT (league_id, season_id) DO NOTHING`,
          [ls.league_id, ls.season_id]
        );
      }
    }

    // Teams
    const validVenueIds = new Set(data.venues.map(v => v.id));
    const validTeamIds = new Set();
    for (const t of data.teams) {
      validTeamIds.add(t.id);
      const countryId = validCountryIds.has(t.country_id) ? t.country_id : null;
      const venueId = validVenueIds.has(t.venue_id) ? t.venue_id : null;
      await client.query(
        `INSERT INTO teams (id, name, country, founded, national, logo, country_id, venue_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           country = COALESCE(EXCLUDED.country, teams.country),
           logo = COALESCE(EXCLUDED.logo, teams.logo),
           venue_id = COALESCE(EXCLUDED.venue_id, teams.venue_id)`,
        [t.id, t.name || `Team ${t.id}`, t.country, t.founded, t.national, t.logo, countryId, venueId]
      );
    }

    // Fixtures Status
    const validStatusIds = new Set();
    for (const s of data.fixtures_status) {
      validStatusIds.add(s.id);
      await client.query(
        `INSERT INTO fixtures_status (id, short, long_es, long_en)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET short = EXCLUDED.short, long_es = EXCLUDED.long_es, long_en = EXCLUDED.long_en`,
        [s.id, s.short, s.long_es, s.long_en]
      );
    }

    // Fixtures (428 from predifutbol.sql + 111 from web/fixtures.json)
    for (const f of data.fixtures || []) {
      if (!validTeamIds.has(f.team_home_id) || !validTeamIds.has(f.team_away_id) || !validLeagueIds.has(f.league_id)) {
        continue;
      }
      const venueId = validVenueIds.has(f.venue_id) ? f.venue_id : null;
      const statusId = validStatusIds.has(f.status_id) ? f.status_id : 2;
      await client.query(
        `INSERT INTO fixtures (
           id, referee, timezone, date, timestamp, elapsed,
           venue_id, venue_name, venue_city,
           goal_home, goal_away, team_home_id, team_away_id, league_id, status_id
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9,
           $10, $11, $12, $13, $14, $15
         )
         ON CONFLICT (id) DO UPDATE SET
           referee = COALESCE(EXCLUDED.referee, fixtures.referee),
           date = COALESCE(EXCLUDED.date, fixtures.date),
           timestamp = COALESCE(EXCLUDED.timestamp, fixtures.timestamp),
           venue_id = COALESCE(EXCLUDED.venue_id, fixtures.venue_id),
           venue_name = COALESCE(EXCLUDED.venue_name, fixtures.venue_name),
           venue_city = COALESCE(EXCLUDED.venue_city, fixtures.venue_city),
           goal_home = COALESCE(EXCLUDED.goal_home, fixtures.goal_home),
           goal_away = COALESCE(EXCLUDED.goal_away, fixtures.goal_away),
           status_id = COALESCE(EXCLUDED.status_id, fixtures.status_id)`,
        [
          f.id,
          f.referee,
          f.timezone || 'America/Bogota',
          f.date || null,
          f.timestamp || null,
          f.elapsed || null,
          venueId,
          f.venue_name || null,
          f.venue_city || null,
          f.goal_home ?? null,
          f.goal_away ?? null,
          f.team_home_id,
          f.team_away_id,
          f.league_id,
          statusId
        ]
      );
    }

    // Type Predictions
    for (const tp of data.type_predictions) {
      await client.query(
        `INSERT INTO type_predictions (id, name, label_es, label_en, valid_values)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, label_es = EXCLUDED.label_es, label_en = EXCLUDED.label_en, valid_values = EXCLUDED.valid_values`,
        [tp.id, tp.name, tp.label_es, tp.label_en, tp.valid_values]
      );
    }

    await client.query('COMMIT');
    console.log('🎉 PostgreSQL database "predifutbol" successfully migrated and seeded with all Yii2 data!');
    await client.end();
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
    console.error('❌ Error seeding PostgreSQL:', err.message);
    return false;
  }
}

async function main() {
  const data = extractFromYii2Files();
  await seedPostgres(data);
}

if (require.main === module) {
  main();
}

module.exports = { extractFromYii2Files, seedPostgres };
