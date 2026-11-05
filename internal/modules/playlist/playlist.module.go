package playlist

import (
	"go.uber.org/fx"
)

var PlaylistModule = fx.Module(
	"playlistmodule",
	fx.Provide(NewPlaylistService),
	fx.Provide(NewPlaylistController),
)
