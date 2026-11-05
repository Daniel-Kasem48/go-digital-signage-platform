package channel_schedule

import (
	"go.uber.org/fx"
)

var ChannelScheduleModule = fx.Module(
	"channelschedulemodule",
	fx.Provide(NewChannelScheduleController),
	fx.Provide(NewChannelScheduleService),

)
