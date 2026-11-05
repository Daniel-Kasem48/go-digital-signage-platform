package websocket

import (
	"encoding/json"
	"log"
)

const RegisterDeviceAction="register-device"
const DeviceRegisteredAction="device-registered"
const DeviceAssigned="device-assigned"
const ContentSync="content-sync"
const SendMessageAction = "send-message"
const JoinRoomAction = "join-room"
const LeaveRoomAction = "leave-room"
const UserJoinedAction = "user-join"
const UserLeftAction = "user-left"
const JoinRoomPrivateAction = "join-room-private"
const RoomJoinedAction = "room-joined"

type Message struct {
	Action  string  `json:"action"`
	//Data string  `json:"message"`
	Data map[string]interface{} `json:"message"` // Dynamic field
	Target  *Room   `json:"target"`
	Sender  *Client `json:"sender"`
}

func (message *Message) encode() []byte {
	encodedMessage, err := json.Marshal(message)
	if err != nil {
		log.Println(err)
	}

	return encodedMessage
}