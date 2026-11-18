/**
 * services/tiktokService.js
 *
 * Generador automático de Copy y Hashtags optimizados para TikTok
 * diseñados para maximizar alcance, retención y comentarios en pronósticos deportivos.
 */

const { formatMarketPick, isGenericMarketName } = require('./marketFormatter');
const { translateTeamName } = require('./teamTranslator');

function cleanHashtag(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-zA-Z0-9 ]/g, '')   // Quitar caracteres especiales
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function generateTikTokContent(prediction = {}) {
  const rawHome = prediction.home_name || 'LOCAL';
  const rawAway = prediction.away_name || 'VISITANTE';
  const home = translateTeamName(rawHome, 'es');
  const away = translateTeamName(rawAway, 'es');
  const league = prediction.league_name || 'LIGA';
  const stadium = prediction.stadium ? ` en ${prediction.stadium}` : '';

  let pick = prediction.custom_pick_es || prediction.custom_pick_en || '';
  if (!pick || isGenericMarketName(pick)) {
    const formatted = formatMarketPick(
      prediction.type_prediction_id,
      prediction.prediction_value
    );
    pick = formatted.es;
  }
  if (!pick) pick = `${prediction.prediction_value || 'Victoria Local'}`;
  const odd = Number(prediction.odd || 1.75).toFixed(2);
  const prob = `${prediction.probability || 70}%`;

  // Detectar liga para el encabezado y hashtag
  const lUpper = league.toUpperCase();
  let leagueHeader = 'FÚTBOL INTERNACIONAL ⚽';
  let leagueTag = 'Futbol';

  if (lUpper.includes('BETPLAY') || lUpper.includes('COLOMBIA') || lUpper.includes('PRIMERA A')) {
    leagueHeader = 'LIGA BETPLAY COLOMBIA 🇨🇴';
    leagueTag = 'LigaBetPlay';
  } else if (lUpper.includes('PREMIER')) {
    leagueHeader = 'PREMIER LEAGUE 🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    leagueTag = 'PremierLeague';
  } else if (lUpper.includes('CHAMPIONS')) {
    leagueHeader = 'UEFA CHAMPIONS LEAGUE 🏆';
    leagueTag = 'ChampionsLeague';
  } else if (lUpper.includes('NATIONS') || lUpper.includes('UNL')) {
    leagueHeader = 'UEFA NATIONS LEAGUE 🌍';
    leagueTag = 'NationsLeague';
  } else if (lUpper.includes('LALIGA') || lUpper.includes('LA LIGA')) {
    leagueHeader = 'LALIGA DE ESPAÑA 🇪🇸';
    leagueTag = 'LaLiga';
  } else if (lUpper.includes('LIBERTADORES')) {
    leagueHeader = 'COPA LIBERTADORES 🌎';
    leagueTag = 'CopaLibertadores';
  } else if (lUpper.includes('SERIE A')) {
    leagueHeader = 'SERIE A ITALIANA 🇮🇹';
    leagueTag = 'SerieA';
  } else if (lUpper.includes('BUNDESLIGA')) {
    leagueHeader = 'BUNDESLIGA ALEMANA 🇩🇪';
    leagueTag = 'Bundesliga';
  }

  // Lista de estadísticas
  const statsList = Array.isArray(prediction.stats_es) && prediction.stats_es.length > 0
    ? prediction.stats_es
    : (Array.isArray(prediction.stats_en) ? prediction.stats_en : []);
  const statsBlock = statsList.map(s => `• ${s}`).join('\n');

  // Copy persuasivo con llamado a la acción y TikTok SEO (Probabilidad de victoria + Predicción)
  const caption = 
`🔥 ¡PRONÓSTICO ${leagueHeader}! ⚽
${home} vs ${away}${stadium}

🔮 Predicción y probabilidad de victoria para ${home} vs ${away} hoy.
🎯 Pick Recomendado: ${pick}
📈 Cuota: ${odd} | Probabilidad estimada: ${prob}

${statsBlock ? `📊 Datos Clave:\n${statsBlock}\n` : ''}
¿Cuál es tu marcador exacto para este partidazo? ¡Déjamelo en los comentarios! 👇💬

¡Síguenos en TikTok para más pronósticos diarios y análisis deportivo! 
Somos PrediFutbol Colombia 🇨🇴⚡`.trim();

  // Hashtags automáticos limpios (100% seguros sin palabras de apuestas/casino que penalicen el algoritmo)
  const homeTag = cleanHashtag(home);
  const awayTag = cleanHashtag(away);
  const matchTag = `${homeTag}vs${awayTag}`;
  const isCol = lUpper.includes('COLOMBIA') || lUpper.includes('BETPLAY') || lUpper.includes('PRIMERA A');

  const tagList = [
    '#PrediFutbol',
    '#PrediFutbolColombia',
    matchTag ? `#${matchTag}` : null,
    matchTag ? `#Prediccion${matchTag}` : null,
    homeTag ? `#${homeTag}` : null,
    homeTag ? `#Pronostico${homeTag}` : null,
    awayTag ? `#${awayTag}` : null,
    awayTag ? `#Pronostico${awayTag}` : null,
    `#${leagueTag}`,
    isCol ? '#FutbolColombiano' : null,
    isCol ? '#LigaBetPlayDimayor' : null,
    '#ProbabilidadDeVictoria',
    '#PronosticosFutbol',
    '#PronosticosDeportivos',
    '#AnalisisDeportivo',
    '#TipsDeportivos',
    '#Parati',
    '#Viral',
    '#FYP',
    '#Colombia'
  ].filter(Boolean);

  const hashtags = [...new Set(tagList)].join(' ');
  const fullText = `${caption}\n\n${hashtags}`;

  return {
    caption,
    hashtags,
    fullText
  };
}

/**
 * Verifica si el contenido de TikTok (caption / hashtags) está desincronizado
 * respecto al partido, cuotas, picks o estadísticas actuales.
 */
function isTikTokContentMismatched(prediction = {}, caption = '', hashtags = '') {
  if (!caption || !hashtags) return true;
  const home = (prediction.home_name || '').trim().toUpperCase();
  const away = (prediction.away_name || '').trim().toUpperCase();
  if (!home || !away) return false;

  const capUpper = caption.toUpperCase();
  const tagsUpper = hashtags.toUpperCase();

  // 1. Detección de fuga de plantillas por defecto (Tolima, Millonarios, Liverpool, Arsenal)
  const defaultTemplates = ['TOLIMA', 'MILLONARIOS', 'LIVERPOOL', 'ARSENAL'];
  for (const t of defaultTemplates) {
    if ((capUpper.includes(t) || tagsUpper.includes(t)) && !home.includes(t) && !away.includes(t)) {
      return true; // Contiene equipos de plantilla que no juegan este partido
    }
  }

  // 2. Verificar que los equipos del partido aparezcan en caption o hashtags
  const getSigWords = (name) => name.split(/[^a-zA-Z0-9]+/).filter(w => w.length >= 4);
  const homeWords = getSigWords(home);
  const awayWords = getSigWords(away);

  const homeInContent = homeWords.length === 0 || homeWords.some(w => capUpper.includes(w) || tagsUpper.includes(w));
  const awayInContent = awayWords.length === 0 || awayWords.some(w => capUpper.includes(w) || tagsUpper.includes(w));

  if (!homeInContent && !awayInContent) {
    return true; // Ni el local ni el visitante aparecen en el contenido
  }

  // 3. Verificar que el pick específico no esté desincronizado
  const pick = (prediction.custom_pick_es || '').trim();
  if (pick && pick.length >= 4 && !isGenericMarketName(pick)) {
    const pickUpper = pick.toUpperCase();
    if (!capUpper.includes(pickUpper)) {
      return true; // El pick cambió y el caption aún tiene el anterior
    }
  }

  // 4. Si el caption contiene bloque de estadísticas ("Datos Clave"), verificar que la 1ra estadística coincida
  if (capUpper.includes('DATOS CLAVE') || capUpper.includes('H2H:')) {
    const firstStat = (prediction.stats_es?.[0] || prediction.stats_en?.[0] || '').trim();
    if (firstStat && firstStat.length > 20) {
      const excerpt = firstStat.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 18).toUpperCase();
      const capClean = caption.replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
      if (excerpt && !capClean.includes(excerpt)) {
        return true; // Las estadísticas del caption son obsoletas
      }
    }
  }

  return false;
}

module.exports = {
  cleanHashtag,
  generateTikTokContent,
  isTikTokContentMismatched
};
