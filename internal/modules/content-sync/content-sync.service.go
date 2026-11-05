package content_sync

import (
	"digital-signage/internal/db"
	device_display "digital-signage/internal/modules/device-display"
	websocket2 "digital-signage/internal/modules/socket"
	"digital-signage/internal/modules/utils"
	nats2 "digital-signage/internal/nats"
	"encoding/json"
	"fmt"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"sort"
)

type ContentSyncService struct {
	wsServer             *websocket2.WsServer
	deviceDisplayService *device_display.DeviceDisplayService
	dbPool               *pgxpool.Pool
	natsService          *nats2.NATSService
}

func NewContentSyncService(
	wsServer *websocket2.WsServer,
	deviceDisplayService *device_display.DeviceDisplayService,
	dbPool *pgxpool.Pool,
	natsService *nats2.NATSService,
) *ContentSyncService {
	return &ContentSyncService{
		wsServer:             wsServer,
		deviceDisplayService: deviceDisplayService,
		dbPool:               dbPool,
		natsService:          natsService,
	}
}

// NotifyDevicesByPlaylistId finds all devices affected by a playlist change and sends sync notifications
func (s *ContentSyncService) NotifyDevicesByPlaylistId(ctx echo.Context, playlistId pgtype.UUID) error {
	fmt.Printf("ContentSync: Triggered by playlist change (ID: %s)\n", playlistId.Bytes)
	mtq, err := db.NewMultiTenantQuerierByContext(ctx, s.dbPool)
	if err != nil {
		return fmt.Errorf("failed to create tenant querier: %v", err)
	}

	// Get all devices that have channels using this playlist
	devices, err := mtq.Querier.GetDevicesByPlaylistID(ctx.Request().Context(), playlistId)
	if err != nil {
		return fmt.Errorf("failed to get devices by playlist ID: %v", err)
	}

	channels, channelErr := mtq.Querier.GetChannelsByPlaylistID(ctx.Request().Context(), playlistId)
	channelIDs := make([]string, 0, len(channels))
	for _, ch := range channels {
		channelIDs = append(channelIDs, utils.UuidBytesToString(ch.ID.Bytes))
	}

	if len(devices) == 0 {
		if channelErr == nil && len(channelIDs) > 0 {
			s.emitChannelSync(ctx, channelIDs)
		}
		return nil
	}

	// Convert device IDs for batch processing
	deviceIds := make([]pgtype.UUID, len(devices))
	for i, device := range devices {
		deviceIds[i] = device.ID
	}

	// Get updated playlist data for all devices
	deviceChannelMap := s.deviceDisplayService.GetDevicesPlaylistItems(ctx, deviceIds)

	// Send sync notifications
	if err := s.sendSyncNotifications(deviceChannelMap); err != nil {
		return err
	}

	if len(channelIDs) > 0 {
		s.emitChannelSync(ctx, channelIDs)
	}
	return nil
}

// NotifyDevicesByChannelId finds all devices affected by a channel change and sends sync notifications
func (s *ContentSyncService) NotifyDevicesByChannelId(ctx echo.Context, channelId pgtype.UUID) error {
	fmt.Printf("ContentSync: Triggered by channel change (ID: %s)\n", channelId.Bytes)
	mtq, err := db.NewMultiTenantQuerierByContext(ctx, s.dbPool)
	if err != nil {
		return fmt.Errorf("failed to create tenant querier: %v", err)
	}

	// Get all devices that have this channel assigned
	devices, err := mtq.Querier.GetDevicesByChannelID(ctx.Request().Context(), channelId)
	if err != nil {
		return fmt.Errorf("failed to get devices by channel ID: %v", err)
	}

	if len(devices) == 0 {
		return nil // No devices to notify
	}

	// Convert device IDs for batch processing
	deviceIds := make([]pgtype.UUID, len(devices))
	for i, device := range devices {
		deviceIds[i] = device.ID
	}

	// Get updated channel data for all devices
	deviceChannelMap := s.deviceDisplayService.GetDevicesPlaylistItems(ctx, deviceIds)

	// Send sync notifications
	if err := s.sendSyncNotifications(deviceChannelMap); err != nil {
		return err
	}

	s.emitChannelSync(ctx, []string{utils.UuidBytesToString(channelId.Bytes)})
	return nil
}

// NotifyDevices sends sync notifications to specific devices
func (s *ContentSyncService) NotifyDevices(ctx echo.Context, deviceIds []pgtype.UUID) error {
	fmt.Printf("ContentSync: Triggered by device active_channel_id update for %d devices\n", len(deviceIds))
	if len(deviceIds) == 0 {
		return nil
	}

	// Get updated data for all devices
	deviceChannelMap := s.deviceDisplayService.GetDevicesPlaylistItems(ctx, deviceIds)

	// Send sync notifications
	if err := s.sendSyncNotifications(deviceChannelMap); err != nil {
		return err
	}

	s.emitChannelSync(ctx, collectChannelIDs(deviceChannelMap))
	return nil
}

// NotifyDevicesCleared sends an empty content-sync payload to explicitly clear device playback state.
func (s *ContentSyncService) NotifyDevicesCleared(deviceIDs []pgtype.UUID) error {
	if len(deviceIDs) == 0 {
		return nil
	}

	roomDeviceIDs := make([]string, 0, len(deviceIDs))
	for _, deviceID := range deviceIDs {
		if !deviceID.Valid {
			continue
		}
		roomDeviceIDs = append(roomDeviceIDs, utils.UuidBytesToString(deviceID.Bytes))
	}

	return s.notifyDevicesClearedByStringIDs(roomDeviceIDs)
}

// NotifyAllDevicesByChannel sends sync notifications to all devices that have any channel assigned
func (s *ContentSyncService) NotifyAllDevicesByChannel(ctx echo.Context) error {
	mtq, err := db.NewMultiTenantQuerierByContext(ctx, s.dbPool)
	if err != nil {
		return fmt.Errorf("failed to create tenant querier: %v", err)
	}

	// Get all devices that have a channel assigned
	devices, err := mtq.Querier.GetDevicesWithActiveChannel(ctx.Request().Context())
	if err != nil {
		return fmt.Errorf("failed to get devices with active channels: %v", err)
	}

	if len(devices) == 0 {
		return nil // No devices to notify
	}

	// Convert device IDs for batch processing
	deviceIds := make([]pgtype.UUID, len(devices))
	for i, device := range devices {
		deviceIds[i] = device.ID
	}

	// Get updated data for all devices
	deviceChannelMap := s.deviceDisplayService.GetDevicesPlaylistItems(ctx, deviceIds)

	// Send sync notifications
	if err := s.sendSyncNotifications(deviceChannelMap); err != nil {
		return err
	}

	s.emitChannelSync(ctx, collectChannelIDs(deviceChannelMap))
	return nil
}

// sendSyncNotifications is the internal method that actually sends the websocket messages
func (s *ContentSyncService) sendSyncNotifications(deviceChannelMap map[string]map[string]*device_display.ActiveChannelDto) error {
	message := websocket2.Message{
		Action: websocket2.ContentSync,
		Data:   make(map[string]interface{}),
	}

	fmt.Printf("ContentSync: Sending sync notifications to %d devices\n", len(deviceChannelMap))

	// Send notification to each device
	for deviceID, channels := range deviceChannelMap {
		for _, ch := range channels {
			marshalledChannel, err := json.Marshal(ch)
			if err != nil {
				return fmt.Errorf("failed to marshal channel for device %s: %v", deviceID, err)
			}

			message.Data["activeChannel"] = string(marshalledChannel)

			fmt.Printf("ContentSync: Emitting contentSync event to device %s (room: device_%s)\n", deviceID, deviceID)
			err = s.wsServer.SendMessageToRoom("device_"+deviceID, message)
			if err != nil {
				// Log error but continue with other devices
				fmt.Printf("Failed to send sync notification to device %s: %v\n", deviceID, err)
			} else {
				fmt.Printf("ContentSync: Successfully sent contentSync event to device %s\n", deviceID)
			}

			s.publishContentSyncEvent(deviceID, message)
		}
	}

	return nil
}

func collectChannelIDs(deviceChannelMap map[string]map[string]*device_display.ActiveChannelDto) []string {
	set := make(map[string]struct{})
	for _, channels := range deviceChannelMap {
		for channelID := range channels {
			if channelID == "" {
				continue
			}
			set[channelID] = struct{}{}
		}
	}

	out := make([]string, 0, len(set))
	for channelID := range set {
		out = append(out, channelID)
	}
	sort.Strings(out)
	return out
}

func (s *ContentSyncService) emitChannelSync(ctx echo.Context, channelIDs []string) {
	if len(channelIDs) == 0 {
		return
	}

	tenant, _ := ctx.Request().Context().Value("tenantSlug").(string)
	if tenant == "" {
		return
	}

	for _, channelID := range channelIDs {
		if channelID == "" {
			continue
		}

		message := websocket2.Message{
			Action: websocket2.ContentSync,
			Data: map[string]interface{}{
				"channelId": channelID,
			},
		}
		roomName := "channel_" + tenant + "_" + channelID
		if err := s.wsServer.SendMessageToRoom(roomName, message); err != nil {
			fmt.Printf("Failed to send channel sync notification to room %s: %v\n", roomName, err)
		}
	}
}

func (s *ContentSyncService) notifyDevicesClearedByStringIDs(deviceIDs []string) error {
	message := websocket2.Message{
		Action: websocket2.ContentSync,
		Data: map[string]interface{}{
			"activeChannel": nil,
		},
	}

	for _, deviceID := range deviceIDs {
		if deviceID == "" {
			continue
		}

		roomName := "device_" + deviceID
		if err := s.wsServer.SendMessageToRoom(roomName, message); err != nil {
			fmt.Printf("Failed to send clear notification to device %s: %v\n", deviceID, err)
		}

		s.publishContentSyncEvent(deviceID, message)
	}

	return nil
}

func (s *ContentSyncService) publishContentSyncEvent(deviceID string, message websocket2.Message) {
	if s.natsService == nil || deviceID == "" {
		return
	}

	payload, err := json.Marshal(map[string]interface{}{
		"deviceId": deviceID,
		"action":   message.Action,
		"message":  message.Data,
	})
	if err != nil {
		fmt.Printf("Failed to marshal content sync event for device %s: %v\n", deviceID, err)
		return
	}

	subject := "digital_signage.content_sync.device." + deviceID
	if err := s.natsService.Publish(subject, payload); err != nil {
		fmt.Printf("Failed to publish content sync event to NATS for device %s: %v\n", deviceID, err)
	}
}
