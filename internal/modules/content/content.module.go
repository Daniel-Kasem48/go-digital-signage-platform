package content

import (
"go.uber.org/fx"
)

var ContentModule = fx.Module(
	"contentemodule",
	fx.Provide(NewContentController),
	fx.Provide(NewContentService),
)

