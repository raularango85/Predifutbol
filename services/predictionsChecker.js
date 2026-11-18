/**
 * services/predictionsChecker.js
 *
 * Node.js port of legacy Yii2 `PredictionsChecker`
 * (`predifutbolapi/modules/v1/models/services/PredictionsChecker.php` & `CronController.php`).
 *
 * Automatically settles pending predictions by evaluating actual match scores
 * against betting market rules (1X2, BTTS, Over/Under, Correct Score, etc.).
 */

require('dotenv').config();
const { Pool } = require('pg');

const API_BASE_URL = process.env.API_FOOTBALL_URL || 'https://api-football-v1.p.rapidapi.com/v3';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'api-football-v1.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.PGHOST || '127.0.0.1',
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'predifutbol'
    });
  }
  return pool;
}

/**
 * Evaluates whether a prediction was right (1) or wrong (0) based on actual goals.
 * Exactly implements the rules from legacy Yii2 PredictionsChecker.
 *
 * @param {Object} prediction - Prediction record
 * @param {number} homeGoals - Actual home goals
 * @param {number} awayGoals - Actual away goals
 * @returns {number} 1 if right (WON), 0 if wrong (LOST)
 */
function evaluatePredictionRules(prediction, homeGoals, awayGoals) {
  const typeId = Number(prediction.type_prediction_id);
  const val = String(prediction.prediction_value || '').trim();
  const totalGoals = homeGoals + awayGoals;

  // 1. Classic (1X2 / Doble Oportunidad)
  if (typeId === 1 || typeId === 17 || typeId === 18) {
    let outcome = null; // 1: Local, 2: Away, 3: Draw
    if (homeGoals > awayGoals) outcome = 1;
    else if (homeGoals < awayGoals) outcome = 2;
    else outcome = 3;

    if (val === '1' && outcome === 1) return 1;
    if (val === '1X' && (outcome === 1 || outcome === 3)) return 1;
    if (val === '2' && outcome === 2) return 1;
    if (val === 'X2' && (outcome === 2 || outcome === 3)) return 1;
    if (val === '12' && (outcome === 1 || outcome === 2)) return 1;
    if (val === 'X' && outcome === 3) return 1;
    return 0;
  }

  // 2. Marcador Exacto (e.g. "2-1")
  if (typeId === 2) {
    const parts = val.split(/[-:]/);
    if (parts.length >= 2) {
      const predHome = parseInt(parts[0], 10);
      const predAway = parseInt(parts[1], 10);
      if (homeGoals === predHome && awayGoals === predAway) return 1;
    }
    return 0;
  }

  // 3. Partido más de X goles (Over Total)
  if (typeId === 3 || typeId === 19) {
    const threshold = parseFloat(val);
    return totalGoals > threshold ? 1 : 0;
  }

  // 4. Partido menos de X goles (Under Total)
  if (typeId === 4 || typeId === 20) {
    const threshold = parseFloat(val);
    return totalGoals < threshold ? 1 : 0;
  }

  // 5. Local más de X goles
  if (typeId === 5) {
    const threshold = parseFloat(val);
    return homeGoals > threshold ? 1 : 0;
  }

  // 6. Local menos de X goles
  if (typeId === 6) {
    const threshold = parseFloat(val);
    return homeGoals < threshold ? 1 : 0;
  }

  // 7. Visitante menos de X goles
  if (typeId === 7) {
    const threshold = parseFloat(val);
    return awayGoals < threshold ? 1 : 0;
  }

  // 8. Visitante más de X goles
  if (typeId === 8) {
    const threshold = parseFloat(val);
    return awayGoals > threshold ? 1 : 0;
  }

  // 9. Ambos equipos marcan (BTTS)
  if (typeId === 9) {
    const isYes = val.toUpperCase() === 'YES' || val.toUpperCase() === 'SI' || val.toUpperCase() === 'SÍ';
    if (isYes) {
      return (homeGoals > 0 && awayGoals > 0) ? 1 : 0;
    } else {
      return (homeGoals === 0 || awayGoals === 0) ? 1 : 0;
    }
  }

  // 14. Asian Handicap Local
  if (typeId === 14) {
    const handicap = parseFloat(val);
    return (homeGoals + handicap > awayGoals) ? 1 : 0;
  }

  // 15. Asian Handicap Away
  if (typeId === 15) {
    const handicap = parseFloat(val);
    return (awayGoals + handicap > homeGoals) ? 1 : 0;
  }

  return 0;
}

/**
 * Consulta un fixture directamente en API-Football si hay API Key disponible
 */
async function fetchApiFixture(fixtureId) {
  if (!RAPIDAPI_KEY || !fixtureId) return null;
  try {
    const url = `${API_BASE_URL}/fixtures?id=${encodeURIComponent(fixtureId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        'X-RapidAPI-Key': RAPIDAPI_KEY
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response && data.response[0] ? data.response[0] : null;
  } catch (err) {
    console.warn(`[predictionsChecker] API-Football fetch failed for fixture ${fixtureId}:`, err.message);
    return null;
  }
}

/**
 * Revisa todas las predicciones pendientes (was_right = 2) y actualiza su resultado
 * Port directo de `(new PredictionsChecker())->execute()` de Yii2
 */
async function checkAllPendingPredictions() {
  const p = getPool();
  const summary = {
    totalPending: 0,
    settled: 0,
    won: 0,
    lost: 0,
    stillPending: 0,
    results: []
  };

  try {
    const res = await p.query(
      `SELECT pr.*, 
              fi.goal_home AS db_goal_home, 
              fi.goal_away AS db_goal_away, 
              fi.status_id AS db_status_id
       FROM predictions pr
       LEFT JOIN fixtures fi ON fi.id = pr.fixture_id
       WHERE pr.was_right = 2
       ORDER BY pr.id ASC`
    );

    const pending = res.rows;
    summary.totalPending = pending.length;

    for (const pred of pending) {
      let homeGoals = null;
      let awayGoals = null;
      let isFinished = false;
      let source = 'none';

      // 1. Intentar consultar en API-Football si tiene fixture_id
      if (pred.fixture_id) {
        const apiFixture = await fetchApiFixture(pred.fixture_id);
        if (apiFixture && apiFixture.fixture && apiFixture.fixture.status) {
          const statusShort = apiFixture.fixture.status.short;
          if (['FT', 'AET', 'PEN'].includes(statusShort) && apiFixture.goals) {
            homeGoals = apiFixture.goals.home;
            awayGoals = apiFixture.goals.away;
            isFinished = true;
            source = 'API-Football (Tiempo Real)';

            // Sincronizar en tabla fixtures local
            try {
              await p.query(
                `UPDATE fixtures 
                 SET goal_home = $1, goal_away = $2, status_id = 8 
                 WHERE id = $3`,
                [homeGoals, awayGoals, pred.fixture_id]
              );
            } catch (e) {}
          }
        }
      }

      // 2. Si no se obtuvo de la API, revisar la BD local fixtures
      if (!isFinished && pred.db_status_id && [8, 9, 10].includes(pred.db_status_id)) {
        if (pred.db_goal_home !== null && pred.db_goal_away !== null) {
          homeGoals = pred.db_goal_home;
          awayGoals = pred.db_goal_away;
          isFinished = true;
          source = 'Base de Datos Local';
        }
      }

      // 3. Evaluar resultado si el partido finalizó
      if (isFinished && homeGoals !== null && awayGoals !== null) {
        const wasRight = evaluatePredictionRules(pred, homeGoals, awayGoals);
        
        await p.query(
          `UPDATE predictions 
           SET was_right = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [wasRight, pred.id]
        );

        summary.settled++;
        if (wasRight === 1) summary.won++;
        else summary.lost++;

        summary.results.push({
          id: pred.id,
          home_name: pred.home_name,
          away_name: pred.away_name,
          score: `${homeGoals} - ${awayGoals}`,
          pick: pred.custom_pick_es || pred.custom_pick_en || pred.prediction_value,
          was_right: wasRight,
          outcome: wasRight === 1 ? 'Acertada' : 'Fallada',
          source
        });
      } else {
        summary.stillPending++;
        summary.results.push({
          id: pred.id,
          home_name: pred.home_name,
          away_name: pred.away_name,
          pick: pred.custom_pick_es || pred.custom_pick_en || pred.prediction_value,
          was_right: 2,
          outcome: 'Pendiente',
          reason: pred.fixture_id ? 'El partido aún no ha finalizado en la API' : 'Predicción sin fixture vinculado'
        });
      }
    }

  } catch (err) {
    console.error('[predictionsChecker] Error checking predictions:', err);
    throw err;
  }

  return summary;
}

/**
 * Permite calificar o revisar manualmente una predicción individual
 */
async function settleSinglePrediction(id, { goal_home, goal_away, was_right } = {}) {
  const p = getPool();
  const numId = Number(id);

  const res = await p.query('SELECT * FROM predictions WHERE id = $1', [numId]);
  const pred = res.rows[0];
  if (!pred) throw new Error(`Predicción #${id} no encontrada`);

  let outcome = null;

  // Si se pasaron goles, evaluar reglas automáticamente
  if (goal_home !== undefined && goal_away !== undefined && goal_home !== null && goal_away !== null) {
    const h = parseInt(goal_home, 10);
    const a = parseInt(goal_away, 10);
    outcome = evaluatePredictionRules(pred, h, a);
  } else if (was_right !== undefined && was_right !== null) {
    outcome = Number(was_right);
  } else {
    throw new Error('Debe proporcionar un marcador (goal_home, goal_away) o un estado was_right');
  }

  await p.query(
    `UPDATE predictions 
     SET was_right = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2`,
    [outcome, numId]
  );

  return {
    id: numId,
    home_name: pred.home_name,
    away_name: pred.away_name,
    was_right: outcome,
    status: outcome === 1 ? 'Acertada' : (outcome === 0 ? 'Fallada' : 'Pendiente')
  };
}

module.exports = {
  evaluatePredictionRules,
  fetchApiFixture,
  checkAllPendingPredictions,
  settleSinglePrediction
};
