
package channel

import (
	device_display "digital-signage/internal/modules/device-display"
	websocket2 "digital-signage/internal/modules/socket"
	"encoding/json"
	"fmt"
)

type ChannelService struct {
	wsServer *websocket2.WsServer
}

func NewChannelService(wsServer *websocket2.WsServer) *ChannelService {
	return &ChannelService{wsServer:wsServer}
}


func (c *ChannelService) NotifyChannelDevices(deviceChannelMap map[string]map[string]*device_display.ActiveChannelDto) error {
	message := websocket2.Message{
		Action: websocket2.ContentSync,
		Data: make(map[string]interface{}),
	}

	// Access the structured data
	for deviceID, channels := range deviceChannelMap {
		fmt.Printf("Device ID: %s\n", deviceID)
		for _, ch := range channels {
			fmt.Printf("ActiveChannelDto: %+v\n", ch)
			marshalledChannel, err := json.Marshal(ch)
			if err != nil {
				return fmt.Errorf("failed to marshal channel: %v", err)
			}
			message.Data["activeChannel"] = string(marshalledChannel) // Convert to string

			err = c.wsServer.SendMessageToRoom("device_" + deviceID, message)
			if err != nil {
				return err
			}
		}
	}

	return nil
}