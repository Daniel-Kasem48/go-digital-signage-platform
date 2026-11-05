package channel

import (
	"go.uber.org/fx"
)

var ChannelModule = fx.Module(
	"channelmodule",
	fx.Provide(NewChannelService),
	fx.Provide(NewChannelController),
)
