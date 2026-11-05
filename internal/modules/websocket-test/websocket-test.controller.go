package websocket_test

import (
	"net/http"
	"time"

	websocket_module "digital-signage/internal/modules/socket"

	"github.com/labstack/echo/v4"
	"go.uber.org/fx"
)

type WebSocketTestController struct {
	wsServer *websocket_module.WsServer
}

type wsTestCustomRequest struct {
	Action  string                 `json:"action"`
	Message map[string]interface{} `json:"message"`
}

func NewWebSocketTestController(wsServer *websocket_module.WsServer) *WebSocketTestController {
	return &WebSocketTestController{
		wsServer: wsServer,
	}
}

// SendContentSyncMessage sends a manual content-sync message to a specific device
// @Summary Send manual content-sync message
// @Description Sends a test content-sync websocket payload to a specific device room.
// @Tags websocket-test
// @Produce json
// @Param deviceId path string true "Device ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BasicAuth
// @Router /api/websocket-test/{deviceId}/content-sync [post]
func (ctrl *WebSocketTestController) SendContentSyncMessage(c echo.Context) error {
	deviceId := c.Param("deviceId")
	if deviceId == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "deviceId is required",
		})
	}

	roomName := "device_" + deviceId

	// Create sample content data
	contentData := map[string]interface{}{
		"type": "template",
		"config": map[string]interface{}{
			"title":           "Manual WebSocket Test",
			"message":         "🚀 This is a manual content sync test!\n\nDevice: " + deviceId + "\nTime: " + time.Now().Format("2006-01-02 15:04:05") + "\n\nIf you see this, WebSocket communication is working! 🎉",
			"backgroundColor": "#e74c3c",
			"textColor":       "#ffffff",
			"displayDuration": 15,
		},
	}

	// Create the message
	message := websocket_module.Message{
		Action: websocket_module.ContentSync,
		Data: map[string]interface{}{
			"deviceId":    deviceId,
			"contentData": contentData,
		},
	}

	// Send to the device room
	err := ctrl.wsServer.SendMessageToRoom(roomName, message)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to send WebSocket message: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":   true,
		"deviceId":  deviceId,
		"roomName":  roomName,
		"action":    "content-sync",
		"message":   "Manual content sync message sent successfully",
		"timestamp": time.Now().Format("2006-01-02 15:04:05"),
	})
}

// SendDeviceAssignedMessage sends a device-assigned message
// @Summary Send manual device-assigned message
// @Description Sends a test device-assigned websocket payload to a specific device room.
// @Tags websocket-test
// @Produce json
// @Param deviceId path string true "Device ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BasicAuth
// @Router /api/websocket-test/{deviceId}/device-assigned [post]
func (ctrl *WebSocketTestController) SendDeviceAssignedMessage(c echo.Context) error {
	deviceId := c.Param("deviceId")
	if deviceId == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "deviceId is required",
		})
	}

	roomName := "device_" + deviceId

	// Create the message
	message := websocket_module.Message{
		Action: websocket_module.DeviceAssigned,
		Data: map[string]interface{}{
			"deviceId":   deviceId,
			"channelId":  "manual-test-channel",
			"assignedAt": time.Now().Format("2006-01-02 15:04:05"),
			"message":    "Device has been manually assigned for testing",
		},
	}

	// Send to the device room
	err := ctrl.wsServer.SendMessageToRoom(roomName, message)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to send WebSocket message: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":   true,
		"deviceId":  deviceId,
		"roomName":  roomName,
		"action":    "device-assigned",
		"message":   "Device assigned message sent successfully",
		"timestamp": time.Now().Format("2006-01-02 15:04:05"),
	})
}

// SendCustomMessage sends a custom WebSocket message
// @Summary Send custom websocket test message
// @Description Sends a custom websocket payload to a specific device room.
// @Tags websocket-test
// @Accept json
// @Produce json
// @Param deviceId path string true "Device ID"
// @Param request body wsTestCustomRequest true "Custom websocket payload"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BasicAuth
// @Router /api/websocket-test/{deviceId}/custom [post]
func (ctrl *WebSocketTestController) SendCustomMessage(c echo.Context) error {
	deviceId := c.Param("deviceId")
	if deviceId == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "deviceId is required",
		})
	}

	// Parse request body for custom message data
	var requestData wsTestCustomRequest

	if err := c.Bind(&requestData); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid JSON payload",
		})
	}

	if requestData.Action == "" {
		requestData.Action = "custom-test"
	}

	if requestData.Message == nil {
		requestData.Message = make(map[string]interface{})
	}

	// Add device ID and timestamp to message
	requestData.Message["deviceId"] = deviceId
	requestData.Message["timestamp"] = time.Now().Format("2006-01-02 15:04:05")
	requestData.Message["test"] = true

	roomName := "device_" + deviceId

	// Create the message
	message := websocket_module.Message{
		Action: requestData.Action,
		Data:   requestData.Message,
	}

	// Send to the device room
	err := ctrl.wsServer.SendMessageToRoom(roomName, message)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to send WebSocket message: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":   true,
		"deviceId":  deviceId,
		"roomName":  roomName,
		"action":    requestData.Action,
		"message":   "Custom message sent successfully",
		"timestamp": time.Now().Format("2006-01-02 15:04:05"),
		"sentData":  requestData.Message,
	})
}

// RegisterRoutes registers all WebSocket test routes
func (ctrl *WebSocketTestController) RegisterRoutes(group *echo.Group) {
	group.POST("/websocket-test/:deviceId/content-sync", ctrl.SendContentSyncMessage)
	group.POST("/websocket-test/:deviceId/device-assigned", ctrl.SendDeviceAssignedMessage)
	group.POST("/websocket-test/:deviceId/custom", ctrl.SendCustomMessage)
}

// Module exports the WebSocket test controller for FX
var Module = fx.Options(
	fx.Provide(NewWebSocketTestController),
)
