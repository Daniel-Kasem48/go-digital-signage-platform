package auth

import (
	"go.uber.org/fx"
)

var AuthModule = fx.Module(
	"authmodule",
	fx.Provide(NewAuthController),
)
