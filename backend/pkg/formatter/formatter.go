package formatter

import (
	"fmt"
	"regexp"
	"strings"
)

type FormattedPick struct {
	ES       string `json:"es"`
	EN       string `json:"en"`
	OptLabel string `json:"opt_label"`
}

var teamTranslationsES = map[string]string{
	"germany":              "Alemania",
	"netherlands":          "Países Bajos",
	"holland":              "Países Bajos",
	"england":              "Inglaterra",
	"spain":                "España",
	"france":               "Francia",
	"italy":                "Italia",
	"belgium":              "Bélgica",
	"croatia":              "Croacia",
	"portugal":             "Portugal",
	"turkey":               "Turquía",
	"turkiye":              "Turquía",
	"türkiye":              "Turquía",
	"czech republic":       "República Checa",
	"czechia":              "República Checa",
	"switzerland":          "Suiza",
	"sweden":               "Suecia",
	"norway":               "Noruega",
	"denmark":              "Dinamarca",
	"poland":               "Polonia",
	"austria":              "Austria",
	"hungary":              "Hungría",
	"romania":              "Rumania",
	"ukraine":              "Ucrania",
	"serbia":               "Serbia",
	"scotland":             "Escocia",
	"wales":                "Gales",
	"greece":               "Grecia",
	"cyprus":               "Chipre",
	"northern ireland":     "Irlanda del Norte",
	"republic of ireland":  "Irlanda",
	"ireland":              "Irlanda",
	"finland":              "Finlandia",
	"slovakia":             "Eslovaquia",
	"slovenia":             "Eslovenia",
	"iceland":              "Islandia",
	"bosnia & herzegovina": "Bosnia y Herzegovina",
	"albania":              "Albania",
	"armenia":              "Armenia",
	"azerbaijan":           "Azerbaiyán",
	"belarus":              "Bielorrusia",
	"bulgaria":             "Bulgaria",
	"estonia":              "Estonia",
	"faroe islands":        "Islas Feroe",
	"georgia":              "Georgia",
	"gibraltar":            "Gibraltar",
	"israel":               "Israel",
	"kazakhstan":           "Kazajistán",
	"kosovo":               "Kosovo",
	"latvia":               "Letonia",
	"liechtenstein":        "Liechtenstein",
	"lithuania":            "Lituania",
	"luxembourg":           "Luxemburgo",
	"malta":                "Malta",
	"moldova":              "Moldavia",
	"montenegro":           "Montenegro",
	"north macedonia":      "Macedonia del Norte",
	"san marino":           "San Marino",
	"brazil":               "Brasil",
	"argentina":            "Argentina",
	"colombia":             "Colombia",
	"uruguay":              "Uruguay",
	"chile":                "Chile",
	"peru":                 "Perú",
	"ecuador":              "Ecuador",
	"paraguay":             "Paraguay",
	"bolivia":              "Bolivia",
	"venezuela":            "Venezuela",
	"usa":                  "Estados Unidos",
	"united states":        "Estados Unidos",
	"mexico":               "México",
	"morocco":              "Marruecos",
	"japan":                "Japón",
	"south korea":          "Corea del Sur",
	"saudi arabia":         "Arabia Saudita",
}

var uRegex = regexp.MustCompile(`(?i)\bU[- ]?(\d{2})\b`)
var womenRegex = regexp.MustCompile(`(?i)\b(Women|W)\b`)

func TranslateTeamName(rawName string, lang string) string {
	name := strings.TrimSpace(rawName)
	if name == "" || lang != "es" {
		return name
	}

	lower := strings.ToLower(name)
	if translated, ok := teamTranslationsES[lower]; ok {
		return translated
	}

	name = uRegex.ReplaceAllString(name, "Sub-$1")
	name = womenRegex.ReplaceAllString(name, "Femenino")

	return name
}

func FormatMarketPick(typeID int, val string) FormattedPick {
	v := strings.TrimSpace(val)
	vUpper := strings.ToUpper(v)

	format1X2 := func(prefixES, prefixEN string) FormattedPick {
		preES := ""
		if prefixES != "" {
			preES = prefixES + " "
		}
		preEN := ""
		if prefixEN != "" {
			preEN = prefixEN + " "
		}

		switch vUpper {
		case "1":
			return FormattedPick{
				ES:       preES + "Gana Local",
				EN:       preEN + "Home Win",
				OptLabel: "1 - Gana Local",
			}
		case "2":
			return FormattedPick{
				ES:       preES + "Gana Visitante",
				EN:       preEN + "Away Win",
				OptLabel: "2 - Gana Visitante",
			}
		case "X":
			return FormattedPick{
				ES:       preES + "Empate",
				EN:       preEN + "Draw",
				OptLabel: "X - Empate",
			}
		case "1X":
			return FormattedPick{
				ES:       preES + "Local o Empate (1X)",
				EN:       preEN + "Home or Draw (1X)",
				OptLabel: "1X - Local o Empate",
			}
		case "X2":
			return FormattedPick{
				ES:       preES + "Empate o Visitante (X2)",
				EN:       preEN + "Draw or Away (X2)",
				OptLabel: "X2 - Empate o Visitante",
			}
		case "12":
			return FormattedPick{
				ES:       preES + "Local o Visitante (12)",
				EN:       preEN + "Home or Away (12)",
				OptLabel: "12 - Local o Visitante",
			}
		default:
			def := v
			if def == "" {
				def = "Gana Local"
			}
			return FormattedPick{
				ES:       preES + def,
				EN:       preEN + def,
				OptLabel: def,
			}
		}
	}

	switch typeID {
	case 1:
		return format1X2("", "")
	case 17:
		return format1X2("1T:", "1st Half:")
	case 18:
		return format1X2("2T:", "2nd Half:")
	case 2:
		return FormattedPick{
			ES:       fmt.Sprintf("Marcador Exacto: %s", v),
			EN:       fmt.Sprintf("Correct Score: %s", v),
			OptLabel: fmt.Sprintf("Marcador %s", v),
		}
	case 3:
		return FormattedPick{
			ES:       fmt.Sprintf("Más de %s Goles", v),
			EN:       fmt.Sprintf("Over %s Goals", v),
			OptLabel: fmt.Sprintf("+%s Goles", v),
		}
	case 4:
		return FormattedPick{
			ES:       fmt.Sprintf("Menos de %s Goles", v),
			EN:       fmt.Sprintf("Under %s Goals", v),
			OptLabel: fmt.Sprintf("-%s Goles", v),
		}
	case 5:
		return FormattedPick{
			ES:       fmt.Sprintf("Local: Más de %s Goles", v),
			EN:       fmt.Sprintf("Home: Over %s Goals", v),
			OptLabel: fmt.Sprintf("Local +%s Goles", v),
		}
	case 6:
		return FormattedPick{
			ES:       fmt.Sprintf("Local: Menos de %s Goles", v),
			EN:       fmt.Sprintf("Home: Under %s Goals", v),
			OptLabel: fmt.Sprintf("Local -%s Goles", v),
		}
	case 7:
		return FormattedPick{
			ES:       fmt.Sprintf("Visitante: Menos de %s Goles", v),
			EN:       fmt.Sprintf("Away: Under %s Goals", v),
			OptLabel: fmt.Sprintf("Visita -%s Goles", v),
		}
	case 8:
		return FormattedPick{
			ES:       fmt.Sprintf("Visitante: Más de %s Goles", v),
			EN:       fmt.Sprintf("Away: Over %s Goals", v),
			OptLabel: fmt.Sprintf("Visita +%s Goles", v),
		}
	case 9:
		isYes := strings.EqualFold(v, "YES") || strings.EqualFold(v, "SI") || strings.EqualFold(v, "SÍ") || strings.EqualFold(v, "1")
		if isYes {
			return FormattedPick{
				ES:       "Ambos Equipos Marcan: SÍ",
				EN:       "Both Teams To Score: YES",
				OptLabel: "Ambos Marcan: SÍ",
			}
		}
		return FormattedPick{
			ES:       "Ambos Equipos Marcan: NO",
			EN:       "Both Teams To Score: NO",
			OptLabel: "Ambos Marcan: NO",
		}
	default:
		return FormattedPick{
			ES:       v,
			EN:       v,
			OptLabel: v,
		}
	}
}

func IsGenericMarketName(str string) bool {
	s := strings.TrimSpace(strings.ToLower(str))
	genericNames := []string{
		"full time result", "1x2", "clasico", "clásico", "classic",
		"ambos equipos marcan", "both teams to score", "btts",
		"partido mas de x goles", "partido más de x goles", "match over x goals",
		"partido menos de x goles", "match under x goals",
		"marcador exacto", "correct score",
	}
	for _, g := range genericNames {
		if s == g {
			return true
		}
	}
	return false
}

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
