package websocket

import (
	"github.com/labstack/echo/v4"
	"go.uber.org/fx"
)

func RegisterWebSocketRoute(e *echo.Echo, server *WsServer) {
	// Register the WebSocket endpoint using Echo
	e.GET("/ws", func(c echo.Context) error {
		ServeWs(server, c.Response().Writer, c.Request())
		return nil

	})
	e.GET("/ws/channel", func(c echo.Context) error {
		ServeChannelWs(server, c.Response().Writer, c.Request())
		return nil
	})
}

var SocketModule = fx.Options(
	fx.Provide(NewWebsocketServer),
	fx.Invoke(RegisterWebSocketRoute),
)
