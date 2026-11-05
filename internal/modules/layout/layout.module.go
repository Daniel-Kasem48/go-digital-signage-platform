package layout

import (
"go.uber.org/fx"
)

var LayoutModule = fx.Module(
	"Layoutemodule",
	fx.Provide(NewLayoutController),
	fx.Provide(NewLayoutService),
)

