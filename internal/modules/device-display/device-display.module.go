package device_display

import (
"go.uber.org/fx"
)

var DeviceDisplayModule = fx.Module(
	"devicedisplayemodule",
	fx.Provide(NewDeviceDisplayController),
	fx.Provide(NewDeviceDisplayService),
)

