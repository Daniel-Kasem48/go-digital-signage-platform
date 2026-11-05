package template

import (
"go.uber.org/fx"
)

var TemplateModule = fx.Module(
	"templatemodule",
	fx.Provide(NewTemplateService),
	fx.Provide(NewTemplateController),
)
