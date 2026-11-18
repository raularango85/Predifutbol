/**
 * services/marketFormatter.js
 *
 * Formats structured prediction market types and pick values into clean,
 * standardized sports betting prediction labels WITHOUT embedding team names
 * (e.g. "Gana Local", "Gana Visitante", "Empate", "Ambos Equipos Marcan: SÍ").
 */

function formatMarketPick(typeId, val) {
  const v = String(val !== undefined && val !== null ? val : '').trim();
  const vUpper = v.toUpperCase();
  const tId = Number(typeId || 1);

  const format1X2 = (prefixEs = '', prefixEn = '') => {
    const preEs = prefixEs ? `${prefixEs} ` : '';
    const preEn = prefixEn ? `${prefixEn} ` : '';
    switch (vUpper) {
      case '1':
        return {
          es: `${preEs}Gana Local`,
          en: `${preEn}Home Win`,
          optLabel: `1 - Gana Local`
        };
      case '2':
        return {
          es: `${preEs}Gana Visitante`,
          en: `${preEn}Away Win`,
          optLabel: `2 - Gana Visitante`
        };
      case 'X':
        return {
          es: `${preEs}Empate`,
          en: `${preEn}Draw`,
          optLabel: `X - Empate`
        };
      case '1X':
        return {
          es: `${preEs}Local o Empate (1X)`,
          en: `${preEn}Home or Draw (1X)`,
          optLabel: `1X - Local o Empate`
        };
      case 'X2':
        return {
          es: `${preEs}Empate o Visitante (X2)`,
          en: `${preEn}Draw or Away (X2)`,
          optLabel: `X2 - Empate o Visitante`
        };
      case '12':
        return {
          es: `${preEs}Local o Visitante (12)`,
          en: `${preEn}Home or Away (12)`,
          optLabel: `12 - Local o Visitante`
        };
      default:
        return {
          es: `${preEs}${v || 'Gana Local'}`,
          en: `${preEn}${v || 'Home Win'}`,
          optLabel: v || '1'
        };
    }
  };

  switch (tId) {
    case 1: // Clásico (1X2 / Ganador)
      return format1X2();

    case 17: // Clásico primer tiempo
      return format1X2('1T:', '1st Half:');

    case 18: // Clásico segundo tiempo
      return format1X2('2T:', '2nd Half:');

    case 2: // Marcador exacto
      return {
        es: `Marcador Exacto: ${v}`,
        en: `Correct Score: ${v}`,
        optLabel: `Marcador ${v}`
      };

    case 3: // Partido más de X goles
      return {
        es: `Más de ${v} Goles`,
        en: `Over ${v} Goals`,
        optLabel: `+${v} Goles (Más de ${v})`
      };

    case 4: // Partido menos de X goles
      return {
        es: `Menos de ${v} Goles`,
        en: `Under ${v} Goals`,
        optLabel: `-${v} Goles (Menos de ${v})`
      };

    case 5: // Local más de X goles
      return {
        es: `Local: Más de ${v} Goles`,
        en: `Home: Over ${v} Goals`,
        optLabel: `Local +${v} Goles`
      };

    case 6: // Local menos de X goles
      return {
        es: `Local: Menos de ${v} Goles`,
        en: `Home: Under ${v} Goals`,
        optLabel: `Local -${v} Goles`
      };

    case 7: // Visitante menos de X goles
      return {
        es: `Visitante: Menos de ${v} Goles`,
        en: `Away: Under ${v} Goals`,
        optLabel: `Visitante -${v} Goles`
      };

    case 8: // Visitante más de X goles
      return {
        es: `Visitante: Más de ${v} Goles`,
        en: `Away: Over ${v} Goals`,
        optLabel: `Visitante +${v} Goles`
      };

    case 9: // Ambos equipos marcan (BTTS)
      if (['YES', 'SI', 'SÍ', '1', 'TRUE'].includes(vUpper)) {
        return {
          es: 'Ambos Equipos Marcan: SÍ',
          en: 'Both Teams To Score: YES',
          optLabel: 'YES - Sí marcan ambos'
        };
      } else {
        return {
          es: 'Ambos Equipos Marcan: NO',
          en: 'Both Teams To Score: NO',
          optLabel: 'NO - No marcan ambos'
        };
      }

    case 10: // Córners más de X
      return {
        es: `Más de ${v} Córners`,
        en: `Over ${v} Corners`,
        optLabel: `+${v} Córners`
      };

    case 11: // Córners menos de X
      return {
        es: `Menos de ${v} Córners`,
        en: `Under ${v} Corners`,
        optLabel: `-${v} Córners`
      };

    case 12: // Tarjetas amarillas más de X
      return {
        es: `Más de ${v} Tarjetas`,
        en: `Over ${v} Yellow Cards`,
        optLabel: `+${v} Tarjetas`
      };

    case 13: // Tarjetas amarillas menos de X
      return {
        es: `Menos de ${v} Tarjetas`,
        en: `Under ${v} Yellow Cards`,
        optLabel: `-${v} Tarjetas`
      };

    case 14: // Handicap asiático local
      return {
        es: `Hándicap Local (${v})`,
        en: `Asian Handicap Home (${v})`,
        optLabel: `Hándicap Local (${v})`
      };

    case 15: // Handicap asiático visitante
      return {
        es: `Hándicap Visitante (${v})`,
        en: `Asian Handicap Away (${v})`,
        optLabel: `Hándicap Visitante (${v})`
      };

    case 16: // Handicap asiático match
      return {
        es: `Hándicap Asiático (${v})`,
        en: `Asian Handicap (${v})`,
        optLabel: `Hándicap (${v})`
      };

    case 19:
    case 21: // 1T más de X goles
      return {
        es: `1T: Más de ${v} Goles`,
        en: `1st Half Over ${v} Goals`,
        optLabel: `1T +${v} Goles`
      };

    case 20:
    case 22: // 1T menos de X goles
      return {
        es: `1T: Menos de ${v} Goles`,
        en: `1st Half Under ${v} Goals`,
        optLabel: `1T -${v} Goles`
      };

    case 23: // Tiros al arco match
      return {
        es: `Más de ${v} Tiros al Arco`,
        en: `Over ${v} Shots on Target`,
        optLabel: `+${v} Tiros al Arco`
      };

    case 24: // Tiros al arco local
      return {
        es: `Local: Más de ${v} Tiros al Arco`,
        en: `Home: Over ${v} Shots on Target`,
        optLabel: `Local +${v} Tiros al Arco`
      };

    case 25: // Tiros al arco visitante
      return {
        es: `Visitante: Más de ${v} Tiros al Arco`,
        en: `Away: Over ${v} Shots on Target`,
        optLabel: `Visitante +${v} Tiros al Arco`
      };

    default:
      return {
        es: `Pick: ${v}`,
        en: `Pick: ${v}`,
        optLabel: v
      };
  }
}

/**
 * Checks if a stored pick string is just the generic market name rather than an actual prediction.
 */
function isGenericMarketName(text) {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  return (
    t === 'clásico' ||
    t === 'clasico' ||
    t === 'full time result (1x2)' ||
    t === '1x2' ||
    t === 'marcador exacto' ||
    t === 'correct score' ||
    t === 'ambos equipos marcan' ||
    t === 'both teams to score (btts)' ||
    t === 'partido más de x goles' ||
    t === 'partido menos de x goles' ||
    t === 'pick' ||
    t === 'predicción'
  );
}

module.exports = {
  formatMarketPick,
  isGenericMarketName
};
