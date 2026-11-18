/**
 * public/js/teamTranslator.js
 *
 * Módulo de traducción inteligente de nombres de equipos y selecciones de fútbol al español.
 * Soporta:
 * - Todas las selecciones nacionales FIFA (UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC).
 * - Clubes internacionales destacados con versiones tradicionales en español.
 * - Categorías juveniles automáticas (U23, U21, U20, U19, U18, U17 -> Sub-21, etc.).
 * - Categorías femeninas (Women, W -> Femenino).
 * - Equipos filiales (II -> B).
 *
 * Compatible con Node.js (CommonJS) y Navegador (UMD/Global).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exported = factory();
    root.TeamTranslator = exported;
    root.translateTeamName = exported.translateTeamName;
    root.translateMatchTitle = exported.translateMatchTitle;
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Diccionario canónico en minúsculas -> Nombre en español
  const TEAM_TRANSLATIONS_ES = {
    // === UEFA (Europa) ===
    'germany': 'Alemania',
    'netherlands': 'Países Bajos',
    'holland': 'Países Bajos',
    'england': 'Inglaterra',
    'spain': 'España',
    'france': 'Francia',
    'italy': 'Italia',
    'belgium': 'Bélgica',
    'croatia': 'Croacia',
    'portugal': 'Portugal',
    'turkey': 'Turquía',
    'turkiye': 'Turquía',
    'türkiye': 'Turquía',
    'czech republic': 'República Checa',
    'czechia': 'República Checa',
    'switzerland': 'Suiza',
    'sweden': 'Suecia',
    'norway': 'Noruega',
    'denmark': 'Dinamarca',
    'poland': 'Polonia',
    'austria': 'Austria',
    'hungary': 'Hungría',
    'romania': 'Rumania',
    'ukraine': 'Ucrania',
    'serbia': 'Serbia',
    'scotland': 'Escocia',
    'wales': 'Gales',
    'greece': 'Grecia',
    'cyprus': 'Chipre',
    'northern ireland': 'Irlanda del Norte',
    'republic of ireland': 'Irlanda',
    'rep. of ireland': 'Irlanda',
    'ireland': 'Irlanda',
    'slovakia': 'Eslovaquia',
    'slovenia': 'Eslovenia',
    'finland': 'Finlandia',
    'albania': 'Albania',
    'bosnia & herzegovina': 'Bosnia y Herzegovina',
    'bosnia and herzegovina': 'Bosnia y Herzegovina',
    'bosnia': 'Bosnia',
    'montenegro': 'Montenegro',
    'belarus': 'Bielorrusia',
    'georgia': 'Georgia',
    'armenia': 'Armenia',
    'azerbaijan': 'Azerbaiyán',
    'azerbaidjan': 'Azerbaiyán',
    'kazakhstan': 'Kazajistán',
    'moldova': 'Moldavia',
    'bulgaria': 'Bulgaria',
    'north macedonia': 'Macedonia del Norte',
    'fyr macedonia': 'Macedonia del Norte',
    'macedonia': 'Macedonia del Norte',
    'kosovo': 'Kosovo',
    'luxembourg': 'Luxemburgo',
    'iceland': 'Islandia',
    'estonia': 'Estonia',
    'latvia': 'Letonia',
    'lithuania': 'Lituania',
    'faroe islands': 'Islas Feroe',
    'gibraltar': 'Gibraltar',
    'malta': 'Malta',
    'andorra': 'Andorra',
    'san marino': 'San Marino',
    'liechtenstein': 'Liechtenstein',
    'israel': 'Israel',
    'russia': 'Rusia',

    // === CONMEBOL (Sudamérica) ===
    'brazil': 'Brasil',
    'argentina': 'Argentina',
    'colombia': 'Colombia',
    'uruguay': 'Uruguay',
    'chile': 'Chile',
    'peru': 'Perú',
    'ecuador': 'Ecuador',
    'paraguay': 'Paraguay',
    'venezuela': 'Venezuela',
    'bolivia': 'Bolivia',

    // === CONCACAF (Norte, Centroamérica y Caribe) ===
    'united states': 'Estados Unidos',
    'usa': 'Estados Unidos',
    'mexico': 'México',
    'canada': 'Canadá',
    'costa rica': 'Costa Rica',
    'panama': 'Panamá',
    'honduras': 'Honduras',
    'jamaica': 'Jamaica',
    'el salvador': 'El Salvador',
    'guatemala': 'Guatemala',
    'nicaragua': 'Nicaragua',
    'dominican republic': 'República Dominicana',
    'haiti': 'Haití',
    'trinidad and tobago': 'Trinidad y Tobago',
    'trinidad & tobago': 'Trinidad y Tobago',
    'curacao': 'Curazao',
    'curaçao': 'Curazao',
    'cayman islands': 'Islas Caimán',
    'virgin islands': 'Islas Vírgenes',
    'saint vincent and the grenadines': 'San Vicente y las Granadinas',
    'st. vincent / grenadines': 'San Vicente y las Granadinas',
    'st. vincent and the grenadines': 'San Vicente y las Granadinas',
    'saint kitts and nevis': 'San Cristóbal y Nieves',
    'st. kitts and nevis': 'San Cristóbal y Nieves',
    'antigua and barbuda': 'Antigua y Barbuda',
    'barbados': 'Barbados',
    'guadeloupe': 'Guadalupe',
    'martinique': 'Martinica',
    'aruba': 'Aruba',
    'cuba': 'Cuba',
    'bermuda': 'Bermudas',
    'puerto rico': 'Puerto Rico',
    'suriname': 'Surinam',
    'guyana': 'Guyana',
    'french guiana': 'Guayana Francesa',
    'belize': 'Belice',

    // === CAF (África) ===
    'morocco': 'Marruecos',
    'senegal': 'Senegal',
    'egypt': 'Egipto',
    'algeria': 'Argelia',
    'tunisia': 'Túnez',
    'nigeria': 'Nigeria',
    'cameroon': 'Camerún',
    'ivory coast': 'Costa de Marfil',
    "cote d'ivoire": 'Costa de Marfil',
    "côte d'ivoire": 'Costa de Marfil',
    'ghana': 'Ghana',
    'south africa': 'Sudáfrica',
    'mali': 'Malí',
    'burkina faso': 'Burkina Faso',
    'dr congo': 'RD Congo',
    'democratic republic of the congo': 'RD Congo',
    'congo': 'Congo',
    'guinea': 'Guinea',
    'equatorial guinea': 'Guinea Ecuatorial',
    'cape verde': 'Cabo Verde',
    'gabon': 'Gabón',
    'angola': 'Angola',
    'zambia': 'Zambia',
    'zimbabwe': 'Zimbabue',
    'kenya': 'Kenia',
    'mozambique': 'Mozambique',
    'madagascar': 'Madagascar',
    'mauritania': 'Mauritania',
    'sudan': 'Sudán',
    'south sudan': 'Sudán del Sur',
    'ethiopia': 'Etiopía',
    'togo': 'Togo',
    'benin': 'Benín',
    'libya': 'Libia',

    // === AFC (Asia) & OFC (Oceanía) ===
    'japan': 'Japón',
    'south korea': 'Corea del Sur',
    'korea republic': 'Corea del Sur',
    'korea': 'Corea del Sur',
    'north korea': 'Corea del Norte',
    'korea dpr': 'Corea del Norte',
    'saudi arabia': 'Arabia Saudita',
    'iran': 'Irán',
    'australia': 'Australia',
    'qatar': 'Catar',
    'iraq': 'Irak',
    'united arab emirates': 'Emiratos Árabes Unidos',
    'uae': 'Emiratos Árabes Unidos',
    'jordan': 'Jordania',
    'uzbekistan': 'Uzbekistán',
    'china': 'China',
    'new zealand': 'Nueva Zelanda',
    'thailand': 'Tailandia',
    'vietnam': 'Vietnam',
    'indonesia': 'Indonesia',
    'malaysia': 'Malasia',
    'philippines': 'Filipinas',
    'singapore': 'Singapur',
    'syria': 'Siria',
    'lebanon': 'Líbano',
    'palestine': 'Palestina',
    'oman': 'Omán',
    'kuwait': 'Kuwait',
    'bahrain': 'Baréin',
    'india': 'India',
    'pakistan': 'Pakistán',

    // === Clubes destacados con nombre tradicional en español ===
    'bayern munich': 'Bayern Múnich',
    'bayern munchen': 'Bayern Múnich',
    'bayern münchen': 'Bayern Múnich',
    'inter milan': 'Inter de Milán',
    'internazionale': 'Inter de Milán',
    'inter': 'Inter de Milán',
    'ac milan': 'Milan',
    'milan': 'Milan',
    'sporting cp': 'Sporting de Lisboa',
    'sporting lisbon': 'Sporting de Lisboa',
    'red star belgrade': 'Estrella Roja',
    'crvena zvezda': 'Estrella Roja',
    'athletic club': 'Athletic Bilbao',
    'dynamo kyiv': 'Dinamo de Kiev',
    'shakhtar donetsk': 'Shakhtar Donetsk',
    'zenit saint petersburg': 'Zenit',
    'cska moscow': 'CSKA Moscú',
    'spartak moscow': 'Spartak de Moscú',
    'lokomotiv moscow': 'Lokomotiv de Moscú',
    'club brugge': 'Brujas',
    'standard liege': 'Standard de Lieja',
    'slavia prague': 'Slavia Praga',
    'sparta prague': 'Sparta Praga',
    'viktoria plzen': 'Viktoria Pilsen',
    'dinamo zagreb': 'Dinamo Zagreb',
    'hajduk split': 'Hajduk Split',
    'partizan belgrade': 'Partizán de Belgrado',
    'steaua bucuresti': 'Steaua de Bucarest',
    'fcsb': 'Steaua de Bucarest',
    'ferencvaros': 'Ferencváros',
    'legia warsaw': 'Legia de Varsovia',
    'celtic': 'Celtic',
    'rangers': 'Rangers',
    'basel': 'Basilea',
    'young boys': 'Young Boys',
    'zurich': 'Zúrich',
    'salzburg': 'Salzburgo',
    'red bull salzburg': 'Salzburgo',
    'rapid vienna': 'Rapid de Viena',
    'austria vienna': 'Austria de Viena',
    'copenhagen': 'Copenhague',
    'fc kobenhavn': 'Copenhague',
    'besiktas': 'Beşiktaş',
    'beşiktaş': 'Beşiktaş',
    'fenerbahce': 'Fenerbahçe',
    'fenerbahçe': 'Fenerbahçe',
    'galatasaray': 'Galatasaray',
    'trabzonspor': 'Trabzonspor',
    'al hilal': 'Al-Hilal',
    'al nassr': 'Al-Nassr',
    'al ittihad': 'Al-Ittihad',
    'al ahli': 'Al-Ahli'
  };

  /**
   * Traduce el nombre de un equipo o selección al español.
   * Maneja sufijos de categorías (U21, U20, U19, Women, W, II).
   *
   * @param {string} rawName - Nombre original (ej: "Germany", "England U21", "Spain Women")
   * @param {string} lang - Idioma destino ('es' por defecto)
   * @returns {string} Nombre traducido o el original si no requiere traducción
   */
  function translateTeamName(rawName, lang = 'es') {
    if (!rawName || typeof rawName !== 'string') return rawName || '';
    if (lang !== 'es') return rawName;

    const trimmed = rawName.trim();
    if (!trimmed) return '';

    // 1. Verificación directa exacta
    const lower = trimmed.toLowerCase();
    if (TEAM_TRANSLATIONS_ES[lower]) {
      return TEAM_TRANSLATIONS_ES[lower];
    }

    // 2. Detección y extracción de sufijos de categoría (ej: U21, U20, U19, Women, W, II)
    // Coincide con: " U23", " U-23", " U21", " U-21", " U20", " U19", " U18", " U17", " U16", " U15"
    const subMatch = trimmed.match(/^(.*?)\s+(?:U-?(\d{2}))$/i);
    if (subMatch) {
      const baseName = subMatch[1].trim();
      const age = subMatch[2];
      const baseTranslated = translateTeamName(baseName, 'es');
      return `${baseTranslated} Sub-${age}`;
    }

    // Coincide con Femenino: " Women", " (W)", " W"
    const femMatch = trimmed.match(/^(.*?)\s+(?:Women|\(W\)|W)$/i);
    if (femMatch && femMatch[1].length > 1) {
      const baseName = femMatch[1].trim();
      const baseTranslated = translateTeamName(baseName, 'es');
      return `${baseTranslated} Femenino`;
    }

    // Coincide con filial: " II" o " 2"
    const reserveMatch = trimmed.match(/^(.*?)\s+(?:II|2)$/i);
    if (reserveMatch) {
      const baseName = reserveMatch[1].trim();
      const baseTranslated = translateTeamName(baseName, 'es');
      return `${baseTranslated} B`;
    }

    // 3. Fallback: devolver el nombre original tal como viene
    return trimmed;
  }

  /**
   * Helper para traducir un enfrentamiento completo: "Local vs Visitante"
   */
  function translateMatchTitle(home, away, lang = 'es') {
    const h = translateTeamName(home, lang);
    const a = translateTeamName(away, lang);
    return `${h} vs ${a}`;
  }

  return {
    translateTeamName,
    translateMatchTitle,
    TEAM_TRANSLATIONS_ES
  };
}));
