package channel

import "github.com/jackc/pgx/v5/pgtype"

type CreateChannelDto struct {
	Name        string  `json:"name" validate:"required"`
	Description *string `json:"description"`
}

type UpdateChannelDto struct {
	Name        string  `json:"name" validate:"required"`
	Description *string `json:"description"`
}

type PublishChannelDto struct {
	DeviceIds []pgtype.UUID `json:"device_ids" validate:"required,min=1,dive"`
}
