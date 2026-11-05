package content_sync

import (
	"go.uber.org/fx"
)

var ContentSyncModule = fx.Module(
	"contentsyncmodule",
	fx.Provide(NewContentSyncService),
)