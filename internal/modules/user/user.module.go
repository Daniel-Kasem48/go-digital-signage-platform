package user

import (
	"go.uber.org/fx"
)

var UserModule = fx.Module(
	"usermodule",
	fx.Provide(NewUserController),
)
