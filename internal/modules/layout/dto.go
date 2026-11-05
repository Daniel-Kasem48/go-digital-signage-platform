package layout

import (
	"encoding/json"
)

type CreateLayoutDTO struct {
	Name  string          `json:"name" validate:"required,min=1,max=255"`
	Zones json.RawMessage `json:"zones" validate:"required"`
}

type UpdateLayoutDTO struct {
	Name  string          `json:"name" validate:"required,min=1,max=255"`
	Zones json.RawMessage `json:"zones" validate:"required"`
}

// LayoutResponseDTO properly handles JSON marshaling for zones
type LayoutResponseDTO struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	Zones     interface{} `json:"zones"`
	CreatedAt string      `json:"created_at"`
	UpdatedAt string      `json:"updated_at"`
}
