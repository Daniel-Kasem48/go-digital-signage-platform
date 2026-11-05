package device_group

import (
	"go.uber.org/fx"
)

var DeviceGroupModule = fx.Module(
	"devicegroupmodule",
	fx.Provide(NewDeviceGroupService),
	fx.Provide(NewDeviceGroupController),
)
