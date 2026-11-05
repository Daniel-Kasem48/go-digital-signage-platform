package device

type CreateDeviceApiParams struct {
	Name string `json:"name" validate:"required"`
	Code string `json:"code" validate:"required"`
}
