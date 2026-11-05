package websocket

import (
	"github.com/google/uuid"
)


type Room struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	ClientsIds  map[string]bool   `json:"clients"` // Change to store client IDs instead of *Client pointers
}

// NewRoom creates a new Room
func NewRoom(name string, private bool) *Room {
	return &Room{
		ID:         uuid.New(),
		Name:       name,
		ClientsIds: make(map[string]bool),
	}
}

// RunRoom runs our room, accepting various requests
func (room *Room) RunRoom() {
	for {
		select {

		//case client := <-room.register:
		//	room.registerClientInRoom(client)

		//case client := <-room.unregister:
		//	room.unregisterClientInRoom(client)

		//case message := <-room.broadcast:
		//	room.broadcastToClientsInRoom(message.encode())
		}

	}
}


func (room *Room) GetId() string {
	return room.ID.String()
}

func (room *Room) GetName() string {
	return room.Name
}