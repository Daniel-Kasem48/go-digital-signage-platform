package device_registration

import (
	"go.uber.org/fx"
)

var Module = fx.Module(
	"deviceregistrationmodule",
	fx.Provide(NewDeviceRegistrationController),
)
