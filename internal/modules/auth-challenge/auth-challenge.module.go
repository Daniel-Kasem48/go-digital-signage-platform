package auth_challenge

import (
	"go.uber.org/fx"
)

var AuthChallengeModule = fx.Module(
	"authchallengemodule",
	fx.Provide(NewAuthChallengeService),
)
