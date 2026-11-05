package file

import "go.uber.org/fx"

var FileModule = fx.Module(
	"filemodule",
	fx.Provide(NewFileService),
	fx.Provide(NewFileController),
)
