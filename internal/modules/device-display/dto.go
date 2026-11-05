package device_display

import "github.com/jackc/pgx/v5/pgtype"

type PlaylistItemDto struct {
	ID             pgtype.UUID
	Order          int32
	LayoutPosition int32
	TimeString     string
	IsActive       bool
	ContentID      string
}

type ZonePlaybackLaneDto struct {
	LayoutPosition  int32
	ZoneKey         string
	TotalDurationMs int64
	Items           []PlaylistItemDto
}

type LayoutDto struct {
	ID    pgtype.UUID
	Name  string
	Zones map[string]interface{}
}

type Playlist struct {
	ID           pgtype.UUID
	Name         string
	LayoutID     pgtype.UUID
	Layout       *LayoutDto
	Items        []PlaylistItemDto
	ZonePlayback []ZonePlaybackLaneDto
}

type ChannelScheduleDto struct {
	ID        pgtype.UUID
	StartTime string
	EndTime   string
	Playlist  Playlist
}

type ActiveChannelDto struct {
	ID        string
	Name      string
	Schedules []ChannelScheduleDto
}

type DeviceData struct {
	Channel ActiveChannelDto
}
