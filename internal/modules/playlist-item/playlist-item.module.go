package playlist_item

import (
	"go.uber.org/fx"
)

var PlaylistItemModule = fx.Module(
	"playlistitemmodule",
	fx.Provide(NewPlaylistItemController),
)
