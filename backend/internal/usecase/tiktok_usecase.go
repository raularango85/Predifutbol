package usecase

import (
	"fmt"
	"regexp"
	"strings"

	"predifutbol/backend/internal/domain"
)

var nonAlphanumericRegex = regexp.MustCompile(`[^a-zA-Z0-9 ]`)
var whitespaceRegex = regexp.MustCompile(`\s+`)

func CleanHashtag(str string) string {
	if str == "" {
		return ""
	}
	clean := nonAlphanumericRegex.ReplaceAllString(str, "")
	words := whitespaceRegex.Split(clean, -1)
	var sb strings.Builder
	for _, w := range words {
		if len(w) == 0 {
			continue
		}
		sb.WriteString(strings.ToUpper(string(w[0])))
		if len(w) > 1 {
			sb.WriteString(strings.ToLower(w[1:]))
		}
	}
	return sb.String()
}

type TikTokContentResult struct {
	Caption  string `json:"caption"`
	Hashtags string `json:"hashtags"`
	FullText string `json:"full_text"`
}

func GenerateTikTokContent(p *domain.Prediction) TikTokContentResult {
	home := TranslateTeamName(p.HomeName, "es")
	away := TranslateTeamName(p.AwayName, "es")
	if home == "" {
		home = "LOCAL"
	}
	if away == "" {
		away = "VISITANTE"
	}
	league := p.LeagueName
	if league == "" {
		league = "LIGA"
	}
	stadium := ""
	if p.Stadium != "" {
		stadium = fmt.Sprintf(" en %s", p.Stadium)
	}

	pick := p.CustomPickES
	if pick == "" || IsGenericMarketName(pick) {
		tID := 1
		if p.TypePredictionID != nil {
			tID = *p.TypePredictionID
		}
		formatted := FormatMarketPick(tID, p.PredictionValue)
		pick = formatted.ES
	}
	if pick == "" {
		pick = p.PredictionValue
	}
	if pick == "" {
		pick = "Victoria Local"
	}

	odd := fmt.Sprintf("%.2f", p.Odd)
	prob := fmt.Sprintf("%d%%", p.Probability)
	if p.Probability <= 0 {
		prob = "70%"
	}

	lUpper := strings.ToUpper(league)
	leagueHeader := "FÚTBOL INTERNACIONAL ⚽"
	leagueTag := "Futbol"

	if strings.Contains(lUpper, "BETPLAY") || strings.Contains(lUpper, "COLOMBIA") || strings.Contains(lUpper, "PRIMERA A") {
		leagueHeader = "LIGA BETPLAY COLOMBIA 🇨🇴"
		leagueTag = "LigaBetPlay"
	} else if strings.Contains(lUpper, "PREMIER") {
		leagueHeader = "PREMIER LEAGUE 🏴󠁧󠁢󠁥󠁮󠁧󠁿"
		leagueTag = "PremierLeague"
	} else if strings.Contains(lUpper, "CHAMPIONS") {
		leagueHeader = "UEFA CHAMPIONS LEAGUE 🏆"
		leagueTag = "ChampionsLeague"
	} else if strings.Contains(lUpper, "NATIONS") || strings.Contains(lUpper, "UNL") {
		leagueHeader = "UEFA NATIONS LEAGUE 🌍"
		leagueTag = "NationsLeague"
	} else if strings.Contains(lUpper, "LALIGA") || strings.Contains(lUpper, "LA LIGA") {
		leagueHeader = "LALIGA DE ESPAÑA 🇪🇸"
		leagueTag = "LaLiga"
	} else if strings.Contains(lUpper, "LIBERTADORES") {
		leagueHeader = "COPA LIBERTADORES 🌎"
		leagueTag = "CopaLibertadores"
	} else if strings.Contains(lUpper, "BRAZIL") || strings.Contains(lUpper, "BRASIL") || strings.Contains(lUpper, "BRASILEIR") {
		leagueHeader = "BRASILEIRÃO • BRASIL 🇧🇷"
		leagueTag = "Brasileirao"
	} else if strings.Contains(lUpper, "SERIE A") {
		leagueHeader = "SERIE A ITALIANA 🇮🇹"
		leagueTag = "SerieA"
	} else if strings.Contains(lUpper, "BUNDESLIGA") {
		leagueHeader = "BUNDESLIGA ALEMANA 🇩🇪"
		leagueTag = "Bundesliga"
	}

	statsList := p.StatsES
	if len(statsList) == 0 {
		statsList = p.StatsEN
	}
	statsBlock := ""
	if len(statsList) > 0 {
		var sb strings.Builder
		sb.WriteString("📊 Datos Clave:\n")
		for _, s := range statsList {
			sb.WriteString(fmt.Sprintf("• %s\n", s))
		}
		statsBlock = sb.String()
	}

	caption := fmt.Sprintf(
		"🔥 ¡PRONÓSTICO %s! ⚽\n%s vs %s%s\n\n🔮 Predicción y probabilidad de victoria para %s vs %s hoy.\n🎯 Pick Recomendado: %s\n📈 Cuota: %s | Probabilidad estimada: %s\n\n%s¿Cuál es tu marcador exacto para este partidazo? ¡Déjamelo en los comentarios! 👇💬\n\n¡Síguenos en TikTok para más pronósticos diarios y análisis deportivo! \nSomos PrediFutbol Colombia 🇨🇴⚡",
		leagueHeader, home, away, stadium, home, away, pick, odd, prob, statsBlock,
	)

	homeTag := CleanHashtag(home)
	awayTag := CleanHashtag(away)
	matchTag := fmt.Sprintf("%svs%s", homeTag, awayTag)
	isCol := strings.Contains(lUpper, "COLOMBIA") || strings.Contains(lUpper, "BETPLAY") || strings.Contains(lUpper, "PRIMERA A")

	baseTags := []string{
		"#PrediFutbol",
		"#PrediFutbolColombia",
		"#" + matchTag,
		"#" + homeTag,
		"#" + awayTag,
		"#" + leagueTag,
	}
	if isCol {
		baseTags = append(baseTags, "#FutbolColombiano")
	} else {
		baseTags = append(baseTags, "#FutbolInternacional")
	}

	extraTags := []string{
		"#PronosticosDeportivos",
		"#AnalisisDeportivo",
		"#DatosDeportivos",
		"#TipsDeportivos",
		"#Parati",
		"#Viral",
		"#FYP",
		"#Colombia",
	}
	baseTags = append(baseTags, extraTags...)
	hashtags := strings.Join(baseTags, " ")

	return TikTokContentResult{
		Caption:  strings.TrimSpace(caption),
		Hashtags: hashtags,
		FullText: strings.TrimSpace(fmt.Sprintf("%s\n\n%s", caption, hashtags)),
	}
}
