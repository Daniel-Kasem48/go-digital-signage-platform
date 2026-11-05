package device

import (
	"go.uber.org/fx"
)

var DeviceModule = fx.Module(
	"devicemodule",
	fx.Provide(NewDeviceService),
	fx.Provide(NewDeviceController),
)
