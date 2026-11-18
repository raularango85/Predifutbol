export interface FormattedPick {
  es: string;
  en: string;
  optLabel: string;
}

export const COMMON_SCORES = [
  '1-0', '2-0', '2-1', '3-0', '3-1', '3-2',
  '0-0', '1-1', '2-2', '3-3',
  '0-1', '0-2', '1-2', '0-3', '1-3', '2-3',
];

export function parseValidValues(validValues?: string | null, typeId: number = 1): string[] {
  if (typeId === 2) {
    return COMMON_SCORES;
  }

  if (!validValues || typeof validValues !== 'string') {
    if (typeId === 9) return ['YES', 'NO'];
    if (typeId === 1 || typeId === 17 || typeId === 18) return ['1', 'X', '2', '1X', 'X2', '12'];
    return ['1'];
  }

  const trimmed = validValues.trim();
  if (trimmed === 'score') {
    return COMMON_SCORES;
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => String(item).trim());
      }
    } catch {
      // fallback to split
    }
  }

  const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length > 0) return parts;

  if (typeId === 9) return ['YES', 'NO'];
  return ['1'];
}

export function formatMarketPick(typeId: number, val: string): FormattedPick {
  const v = String(val !== undefined && val !== null ? val : '').trim();
  const vUpper = v.toUpperCase();
  const tId = Number(typeId || 1);

  const format1X2 = (prefixEs = '', prefixEn = ''): FormattedPick => {
    const preEs = prefixEs ? `${prefixEs} ` : '';
    const preEn = prefixEn ? `${prefixEn} ` : '';
    switch (vUpper) {
      case '1':
        return {
          es: `${preEs}Gana Local`,
          en: `${preEn}Home Win`,
          optLabel: '1 - Gana Local',
        };
      case '2':
        return {
          es: `${preEs}Gana Visitante`,
          en: `${preEn}Away Win`,
          optLabel: '2 - Gana Visitante',
        };
      case 'X':
        return {
          es: `${preEs}Empate`,
          en: `${preEn}Draw`,
          optLabel: 'X - Empate',
        };
      case '1X':
        return {
          es: `${preEs}Local o Empate (1X)`,
          en: `${preEn}Home or Draw (1X)`,
          optLabel: '1X - Local o Empate',
        };
      case 'X2':
        return {
          es: `${preEs}Empate o Visitante (X2)`,
          en: `${preEn}Draw or Away (X2)`,
          optLabel: 'X2 - Empate o Visitante',
        };
      case '12':
        return {
          es: `${preEs}Local o Visitante (12)`,
          en: `${preEn}Home or Away (12)`,
          optLabel: '12 - Local o Visitante',
        };
      default:
        return {
          es: `${preEs}${v || 'Gana Local'}`,
          en: `${preEn}${v || 'Home Win'}`,
          optLabel: v || '1',
        };
    }
  };

  switch (tId) {
    case 1:
      return format1X2();
    case 17:
      return format1X2('1T:', '1st Half:');
    case 18:
      return format1X2('2T:', '2nd Half:');
    case 2:
      return {
        es: `Marcador Exacto: ${v}`,
        en: `Correct Score: ${v}`,
        optLabel: `Marcador ${v}`,
      };
    case 3:
      return {
        es: `Más de ${v} Goles`,
        en: `Over ${v} Goals`,
        optLabel: `+${v} Goles (Más de ${v})`,
      };
    case 4:
      return {
        es: `Menos de ${v} Goles`,
        en: `Under ${v} Goals`,
        optLabel: `-${v} Goles (Menos de ${v})`,
      };
    case 5:
      return {
        es: `Local: Más de ${v} Goles`,
        en: `Home: Over ${v} Goals`,
        optLabel: `Local +${v} Goles`,
      };
    case 6:
      return {
        es: `Local: Menos de ${v} Goles`,
        en: `Home: Under ${v} Goals`,
        optLabel: `Local -${v} Goles`,
      };
    case 7:
      return {
        es: `Visitante: Menos de ${v} Goles`,
        en: `Away: Under ${v} Goals`,
        optLabel: `Visitante -${v} Goles`,
      };
    case 8:
      return {
        es: `Visitante: Más de ${v} Goles`,
        en: `Away: Over ${v} Goals`,
        optLabel: `Visitante +${v} Goles`,
      };
    case 9:
      if (['YES', 'SI', 'SÍ', '1', 'TRUE'].includes(vUpper)) {
        return {
          es: 'Ambos Equipos Marcan: SÍ',
          en: 'Both Teams To Score: YES',
          optLabel: 'YES - Sí marcan ambos',
        };
      }
      return {
        es: 'Ambos Equipos Marcan: NO',
        en: 'Both Teams To Score: NO',
        optLabel: 'NO - No marcan ambos',
      };
    case 10:
      return {
        es: `Más de ${v} Córners`,
        en: `Over ${v} Corners`,
        optLabel: `+${v} Córners`,
      };
    case 11:
      return {
        es: `Menos de ${v} Córners`,
        en: `Under ${v} Corners`,
        optLabel: `-${v} Córners`,
      };
    case 12:
      return {
        es: `Más de ${v} Tarjetas`,
        en: `Over ${v} Yellow Cards`,
        optLabel: `+${v} Tarjetas`,
      };
    case 13:
      return {
        es: `Menos de ${v} Tarjetas`,
        en: `Under ${v} Yellow Cards`,
        optLabel: `-${v} Tarjetas`,
      };
    case 14:
      return {
        es: `Hándicap Local (${v})`,
        en: `Asian Handicap Home (${v})`,
        optLabel: `Hándicap Local (${v})`,
      };
    case 15:
      return {
        es: `Hándicap Visitante (${v})`,
        en: `Asian Handicap Away (${v})`,
        optLabel: `Hándicap Visitante (${v})`,
      };
    case 16:
      return {
        es: `Hándicap Asiático (${v})`,
        en: `Asian Handicap (${v})`,
        optLabel: `Hándicap (${v})`,
      };
    case 19:
    case 21:
      return {
        es: `1T: Más de ${v} Goles`,
        en: `1st Half Over ${v} Goals`,
        optLabel: `1T +${v} Goles`,
      };
    case 20:
    case 22:
      return {
        es: `1T: Menos de ${v} Goles`,
        en: `1st Half Under ${v} Goals`,
        optLabel: `1T -${v} Goles`,
      };
    case 23:
      return {
        es: `Más de ${v} Tiros al Arco`,
        en: `Over ${v} Shots on Target`,
        optLabel: `+${v} Tiros al Arco`,
      };
    case 24:
      return {
        es: `Local: Más de ${v} Tiros al Arco`,
        en: `Home: Over ${v} Shots on Target`,
        optLabel: `Local +${v} Tiros al Arco`,
      };
    case 25:
      return {
        es: `Visitante: Más de ${v} Tiros al Arco`,
        en: `Away: Over ${v} Shots on Target`,
        optLabel: `Visitante +${v} Tiros al Arco`,
      };
    default:
      return {
        es: `Pick: ${v}`,
        en: `Pick: ${v}`,
        optLabel: v,
      };
  }
}
