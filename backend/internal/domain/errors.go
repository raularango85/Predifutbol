package domain

import "errors"

var (
	ErrNotFound      = errors.New("record not found")
	ErrInvalidInput  = errors.New("invalid input data")
	ErrConflict      = errors.New("record already exists or conflicts with current state")
	ErrInternal      = errors.New("internal server error")
	ErrExternalAPI   = errors.New("external API error")
)
