package device_group

type CreateDeviceGroupApiParams struct {
	Name string `json:"name" validate:"required"`
}

type BulkAddDevicesToGroupApiParams struct {
	DeviceIds []string `json:"device_ids" validate:"required"`
}
