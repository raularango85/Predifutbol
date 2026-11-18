package usecase

import (
	"predifutbol/backend/pkg/formatter"
)

type FormattedPick = formatter.FormattedPick

var (
	TranslateTeamName   = formatter.TranslateTeamName
	FormatMarketPick    = formatter.FormatMarketPick
	IsGenericMarketName = formatter.IsGenericMarketName
)
