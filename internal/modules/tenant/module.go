package tenant

import "go.uber.org/fx"

var TenantModule = fx.Module(
	"tenantmodule",
	fx.Provide(NewTenantService),
	fx.Provide(NewTenantManager),
	fx.Provide(NewTenantController),
)
