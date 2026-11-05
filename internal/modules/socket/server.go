package websocket

import (
	"context"
	"digital-signage/internal/config"
	"digital-signage/internal/db"
	nats2 "digital-signage/internal/nats"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"

	"github.com/nats-io/nats.go"
	"go.uber.org/fx"
)

const (
	roomKVMutationMaxRetries = 5
	roomSubjectPrefix        = "ws.room."
)

type WsServer struct {
	clients           map[*Client]bool
	register          chan *Client
	unregister        chan *Client
	broadcast         chan []byte
	natsService       *nats2.NATSService
	datasourceService *db.DatasourceService
	cfg               *config.Config
	clientsByID       map[string]*Client
	localRooms        map[string]map[string]*Client
	roomSub           *nats.Subscription
	mu                sync.RWMutex
}

// NewWebsocketServer creates a new WsServer type
func NewWebsocketServer(
	datasourceService *db.DatasourceService,
	cfg *config.Config,
	natsService *nats2.NATSService,
	lc fx.Lifecycle,
) *WsServer {
	wsServer := &WsServer{
		clients:           make(map[*Client]bool),
		register:          make(chan *Client),
		unregister:        make(chan *Client),
		broadcast:         make(chan []byte),
		datasourceService: datasourceService,
		cfg:               cfg,
		natsService:       natsService,
		clientsByID:       make(map[string]*Client),
		localRooms:        make(map[string]map[string]*Client),
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if err := wsServer.subscribeToRoomMessages(); err != nil {
				return err
			}
			go wsServer.Run()
			fmt.Println("WsServer is running")
			return nil
		},
		OnStop: func(ctx context.Context) error {
			fmt.Println("WsServer is stopping, disconnecting clients...")

			if wsServer.roomSub != nil {
				_ = wsServer.roomSub.Unsubscribe()
			}

			for _, client := range wsServer.snapshotClients() {
				client.disconnect()
			}

			return nil
		},
	})

	return wsServer
}

// Run our websocket server, accepting various requests
func (server *WsServer) Run() {
	for {
		select {
		case client := <-server.register:
			server.registerClient(client)
		case client := <-server.unregister:
			server.unregisterClient(client)
		case message := <-server.broadcast:
			server.broadcastToClients(message)
		}
	}
}

func (server *WsServer) registerClient(client *Client) {
	server.mu.Lock()
	defer server.mu.Unlock()

	server.clients[client] = true
	server.clientsByID[client.ID.String()] = client
}

func (server *WsServer) LeaveRoom(roomName string, client *Client) error {
	if server.natsService != nil {
		if err := server.removeClientFromRoomKV(roomName, client.ID.String()); err != nil {
			return err
		}
	}

	server.removeClientFromLocalRoom(roomName, client)
	return nil
}

func (server *WsServer) unregisterClient(client *Client) {
	for _, roomName := range client.roomNames() {
		server.removeClientFromLocalRoom(roomName, client)
	}

	server.mu.Lock()
	defer server.mu.Unlock()

	if _, ok := server.clients[client]; ok {
		delete(server.clients, client)
		delete(server.clientsByID, client.ID.String())
		close(client.send)
	}
}

func (server *WsServer) broadcastToClients(message []byte) {
	for _, client := range server.snapshotClients() {
		select {
		case client.send <- message:
		default:
			log.Printf("dropping broadcast message for client %s: send buffer full", client.ID)
		}
	}
}

func (server *WsServer) findRoomByName(name string) (*Room, error) {
	if server.natsService == nil {
		return nil, fmt.Errorf("room not found: NATS service not available")
	}

	bucket, err := server.natsService.GetRoomBucket()
	if err != nil {
		return nil, fmt.Errorf("failed to get room bucket: %w", err)
	}

	entry, err := bucket.Get(name)
	if err != nil {
		if errors.Is(err, nats.ErrKeyNotFound) || errors.Is(err, nats.ErrKeyDeleted) {
			return nil, err
		}
		return nil, err
	}

	var room Room
	if err := json.Unmarshal(entry.Value(), &room); err != nil {
		return nil, err
	}

	return &room, nil
}

func (server *WsServer) createRoom(name string, private bool) (*Room, error) {
	room := NewRoom(name, private)
	if server.natsService == nil {
		return room, nil
	}

	bucket, err := server.natsService.GetRoomBucket()
	if err != nil {
		return nil, fmt.Errorf("failed to get room bucket: %w", err)
	}

	roomData, err := json.Marshal(room)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal room data: %w", err)
	}

	_, err = bucket.Create(name, roomData)
	if err != nil {
		if errors.Is(err, nats.ErrKeyExists) {
			return server.findRoomByName(name)
		}
		return nil, fmt.Errorf("failed to create room in NATS: %w", err)
	}

	return room, nil
}

func (server *WsServer) findClientByID(ID string) *Client {
	server.mu.RLock()
	defer server.mu.RUnlock()

	client, ok := server.clientsByID[ID]
	if !ok {
		return nil
	}
	return client
}

// SendMessageToRoom Function to send a message to all clients in a specific room
func (server *WsServer) SendMessageToRoom(roomName string, message Message) error {
	if strings.TrimSpace(roomName) == "" {
		return fmt.Errorf("room name is required")
	}

	payload := message.encode()
	if server.natsService == nil {
		server.broadcastToLocalRoom(roomName, payload)
		return nil
	}

	subject := roomSubject(roomName)
	if err := server.natsService.Publish(subject, payload); err != nil {
		return fmt.Errorf("failed to publish message to room '%s': %w", roomName, err)
	}
	return nil
}

func (server *WsServer) JoinRoom(roomName string, client *Client) error {
	if strings.TrimSpace(roomName) == "" {
		return fmt.Errorf("room name is required")
	}

	if server.natsService != nil {
		if err := server.addClientToRoomKV(roomName, client.ID.String()); err != nil {
			return err
		}
	}

	server.addClientToLocalRoom(roomName, client)
	return nil
}

func (server *WsServer) BroadcastToClientsInRoom(room *Room, message []byte) {
	if room == nil {
		return
	}
	server.broadcastToLocalRoom(room.Name, message)
}

func (server *WsServer) subscribeToRoomMessages() error {
	if server.natsService == nil {
		return nil
	}

	sub, err := server.natsService.Subscribe(roomSubjectPrefix+"*", func(msg *nats.Msg) {
		roomName, err := roomNameFromSubject(msg.Subject)
		if err != nil {
			log.Printf("failed to parse room subject '%s': %v", msg.Subject, err)
			return
		}
		server.broadcastToLocalRoom(roomName, msg.Data)
	})
	if err != nil {
		return fmt.Errorf("failed to subscribe to room messages: %w", err)
	}

	server.roomSub = sub
	return nil
}

func (server *WsServer) snapshotClients() []*Client {
	server.mu.RLock()
	defer server.mu.RUnlock()

	clients := make([]*Client, 0, len(server.clients))
	for client := range server.clients {
		clients = append(clients, client)
	}
	return clients
}

func (server *WsServer) addClientToLocalRoom(roomName string, client *Client) {
	server.mu.Lock()
	if server.localRooms[roomName] == nil {
		server.localRooms[roomName] = make(map[string]*Client)
	}
	server.localRooms[roomName][client.ID.String()] = client
	server.mu.Unlock()

	client.markRoomJoined(roomName)
}

func (server *WsServer) removeClientFromLocalRoom(roomName string, client *Client) {
	server.mu.Lock()
	if roomClients, ok := server.localRooms[roomName]; ok {
		delete(roomClients, client.ID.String())
		if len(roomClients) == 0 {
			delete(server.localRooms, roomName)
		}
	}
	server.mu.Unlock()

	client.markRoomLeft(roomName)
}

func (server *WsServer) broadcastToLocalRoom(roomName string, message []byte) {
	server.mu.RLock()
	roomClients := server.localRooms[roomName]
	clients := make([]*Client, 0, len(roomClients))
	for _, client := range roomClients {
		clients = append(clients, client)
	}
	server.mu.RUnlock()

	for _, client := range clients {
		select {
		case client.send <- message:
		default:
			log.Printf("dropping room message for client %s in room '%s': send buffer full", client.ID, roomName)
		}
	}
}

func (server *WsServer) addClientToRoomKV(roomName, clientID string) error {
	bucket, err := server.natsService.GetRoomBucket()
	if err != nil {
		return fmt.Errorf("failed to get room bucket: %w", err)
	}

	for attempt := 0; attempt < roomKVMutationMaxRetries; attempt++ {
		entry, err := bucket.Get(roomName)
		if err != nil {
			if errors.Is(err, nats.ErrKeyNotFound) || errors.Is(err, nats.ErrKeyDeleted) {
				room := NewRoom(roomName, false)
				room.ClientsIds[clientID] = true
				roomData, marshalErr := json.Marshal(room)
				if marshalErr != nil {
					return fmt.Errorf("failed to marshal room data: %w", marshalErr)
				}

				_, err = bucket.Create(roomName, roomData)
				if err == nil {
					return nil
				}
				if errors.Is(err, nats.ErrKeyExists) {
					continue
				}
				return fmt.Errorf("failed to create room '%s': %w", roomName, err)
			}
			return fmt.Errorf("failed to get room '%s': %w", roomName, err)
		}

		var room Room
		if err := json.Unmarshal(entry.Value(), &room); err != nil {
			return fmt.Errorf("failed to decode room '%s': %w", roomName, err)
		}

		if room.ClientsIds == nil {
			room.ClientsIds = make(map[string]bool)
		}
		if room.ClientsIds[clientID] {
			return nil
		}
		room.ClientsIds[clientID] = true

		roomData, err := json.Marshal(room)
		if err != nil {
			return fmt.Errorf("failed to encode room '%s': %w", roomName, err)
		}

		_, err = bucket.Update(roomName, roomData, entry.Revision())
		if err == nil {
			return nil
		}
		if errors.Is(err, nats.ErrKeyExists) {
			continue
		}
		return fmt.Errorf("failed to update room '%s': %w", roomName, err)
	}

	return fmt.Errorf("failed to update room '%s': too many concurrent updates", roomName)
}

func (server *WsServer) removeClientFromRoomKV(roomName, clientID string) error {
	bucket, err := server.natsService.GetRoomBucket()
	if err != nil {
		return fmt.Errorf("failed to get room bucket: %w", err)
	}

	for attempt := 0; attempt < roomKVMutationMaxRetries; attempt++ {
		entry, err := bucket.Get(roomName)
		if err != nil {
			if errors.Is(err, nats.ErrKeyNotFound) || errors.Is(err, nats.ErrKeyDeleted) {
				return nil
			}
			return fmt.Errorf("failed to get room '%s': %w", roomName, err)
		}

		var room Room
		if err := json.Unmarshal(entry.Value(), &room); err != nil {
			return fmt.Errorf("failed to decode room '%s': %w", roomName, err)
		}

		if room.ClientsIds == nil {
			return nil
		}
		if _, ok := room.ClientsIds[clientID]; !ok {
			return nil
		}
		delete(room.ClientsIds, clientID)

		if len(room.ClientsIds) == 0 {
			err = bucket.Delete(roomName, nats.LastRevision(entry.Revision()))
			if err == nil || errors.Is(err, nats.ErrKeyNotFound) || errors.Is(err, nats.ErrKeyDeleted) {
				return nil
			}
			if errors.Is(err, nats.ErrKeyExists) {
				continue
			}
			return fmt.Errorf("failed to delete empty room '%s': %w", roomName, err)
		}

		roomData, err := json.Marshal(room)
		if err != nil {
			return fmt.Errorf("failed to encode room '%s': %w", roomName, err)
		}

		_, err = bucket.Update(roomName, roomData, entry.Revision())
		if err == nil {
			return nil
		}
		if errors.Is(err, nats.ErrKeyExists) {
			continue
		}
		return fmt.Errorf("failed to update room '%s': %w", roomName, err)
	}

	return fmt.Errorf("failed to update room '%s': too many concurrent updates", roomName)
}

func roomSubject(roomName string) string {
	encodedRoom := base64.RawURLEncoding.EncodeToString([]byte(roomName))
	return roomSubjectPrefix + encodedRoom
}

func roomNameFromSubject(subject string) (string, error) {
	if !strings.HasPrefix(subject, roomSubjectPrefix) {
		return "", fmt.Errorf("unexpected subject prefix")
	}

	token := strings.TrimPrefix(subject, roomSubjectPrefix)
	if token == "" {
		return "", fmt.Errorf("missing room token")
	}

	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return "", fmt.Errorf("invalid room token: %w", err)
	}

	return string(decoded), nil
}
