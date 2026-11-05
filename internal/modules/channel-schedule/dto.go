package channel_schedule


import (
	"github.com/jackc/pgx/v5/pgtype"
)


type CreateManyChannelScheduleDto struct {
	Schedules []CreateChannelScheduleDto `json:"schedules" validate:"required,dive"`
}

type CreateChannelScheduleDto struct {
	StartDatetime string    `json:"start_datetime" validate:"required"` // Time in a string format (you could also use time.Time)
	EndDatetime   string    `json:"end_datetime" validate:"required"`   // Time in a string format
	ChannelID     pgtype.UUID `json:"channel_id" validate:"required"` // UUID for channel
	PlaylistID    pgtype.UUID `json:"playlist_id" validate:"required"` // UUID for playlist
	Day           int    `json:"day" validate:"min=0"`  // Day as integer (0=ALL, 1=MON, etc)
}
