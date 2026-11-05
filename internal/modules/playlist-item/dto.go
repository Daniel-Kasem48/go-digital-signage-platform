package playlist_item

import "github.com/jackc/pgx/v5/pgtype"

type CreatePlaylistItemDto struct {
	//Order          int32   `json:"order" validate:"required"`
	LayoutPosition int32   `json:"layoutPosition" validate:"required"`
	Timestring     string  `json:"timestring" validate:"required"`
	IsActive       bool  `json:"isActive" validate:"required"`
	ContentID  string      `json:"contentId" validate:"required"`
	PlaylistId pgtype.UUID `json:"playlistId" validate:"required"`
}

type UpdatePlaylistItemDto struct {
	Order          *int32       `json:"order,omitempty"`
	LayoutPosition *int32       `json:"layoutPosition,omitempty"`
	Timestring     *string      `json:"timestring,omitempty"`
	IsActive       *bool        `json:"isActive,omitempty"`
	ContentID      *string      `json:"contentId,omitempty"`
	PlaylistId     *pgtype.UUID `json:"playlistId,omitempty"`
}