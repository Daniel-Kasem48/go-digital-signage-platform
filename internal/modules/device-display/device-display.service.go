package device_display

import (
	"digital-signage/internal/db"
	models "digital-signage/internal/db"
	"digital-signage/internal/modules/utils"
	"encoding/json"
	"fmt"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"sort"
	"strconv"
	"strings"
)

type DeviceDisplayService struct {
	datasourceService *models.DatasourceService
	dbPool            *pgxpool.Pool
}

func NewDeviceDisplayService(datasourceService *models.DatasourceService, dbPool *pgxpool.Pool) *DeviceDisplayService {
	return &DeviceDisplayService{datasourceService: datasourceService, dbPool: dbPool}
}

func parseDurationMs(timeString string) int64 {
	value := strings.TrimSpace(timeString)
	if value == "" {
		return 10000
	}

	parts := strings.Split(value, ":")
	if len(parts) != 3 {
		return 10000
	}

	hours, errH := strconv.Atoi(parts[0])
	minutes, errM := strconv.Atoi(parts[1])
	seconds, errS := strconv.Atoi(parts[2])
	if errH != nil || errM != nil || errS != nil || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60 {
		return 10000
	}

	totalSeconds := hours*3600 + minutes*60 + seconds
	if totalSeconds <= 0 {
		return 10000
	}

	return int64(totalSeconds) * 1000
}

func zoneKeysByPosition(layout *LayoutDto) []string {
	if layout == nil || len(layout.Zones) == 0 {
		return []string{"zone-1"}
	}

	keys := make([]string, 0, len(layout.Zones))
	for key := range layout.Zones {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func zoneKeyForPosition(layout *LayoutDto, layoutPosition int32) string {
	keys := zoneKeysByPosition(layout)
	if len(keys) == 0 {
		return fmt.Sprintf("zone-%d", layoutPosition)
	}

	index := int(layoutPosition) - 1
	if index < 0 || index >= len(keys) {
		return fmt.Sprintf("zone-%d", layoutPosition)
	}

	return keys[index]
}

func buildZonePlayback(schedule *ChannelScheduleDto) {
	if schedule == nil {
		return
	}

	activeItems := make([]PlaylistItemDto, 0, len(schedule.Playlist.Items))
	for _, item := range schedule.Playlist.Items {
		if item.IsActive {
			activeItems = append(activeItems, item)
		}
	}

	sort.Slice(activeItems, func(i, j int) bool {
		if activeItems[i].LayoutPosition == activeItems[j].LayoutPosition {
			return activeItems[i].Order < activeItems[j].Order
		}
		return activeItems[i].LayoutPosition < activeItems[j].LayoutPosition
	})

	lanesByPosition := make(map[int32]*ZonePlaybackLaneDto)
	laneOrder := make([]int32, 0)

	for _, item := range activeItems {
		position := item.LayoutPosition
		if position <= 0 {
			position = 1
		}

		lane, exists := lanesByPosition[position]
		if !exists {
			lane = &ZonePlaybackLaneDto{
				LayoutPosition: position,
				ZoneKey:        zoneKeyForPosition(schedule.Playlist.Layout, position),
				Items:          []PlaylistItemDto{},
			}
			lanesByPosition[position] = lane
			laneOrder = append(laneOrder, position)
		}

		lane.Items = append(lane.Items, item)
		lane.TotalDurationMs += parseDurationMs(item.TimeString)
	}

	sort.Slice(laneOrder, func(i, j int) bool { return laneOrder[i] < laneOrder[j] })

	schedule.Playlist.ZonePlayback = make([]ZonePlaybackLaneDto, 0, len(laneOrder))
	for _, position := range laneOrder {
		if lane := lanesByPosition[position]; lane != nil {
			schedule.Playlist.ZonePlayback = append(schedule.Playlist.ZonePlayback, *lane)
		}
	}
}

func (s *DeviceDisplayService) GetDevicePlaylistItems(ctx echo.Context, deviceId pgtype.UUID) map[string]*ActiveChannelDto {
	// Use tenant-aware queries
	mtq, err := db.NewMultiTenantQuerierByContext(ctx, s.dbPool)
	if err != nil {
		fmt.Printf("error creating tenant querier: %v\n", err)
		return make(map[string]*ActiveChannelDto)
	}

	rows, err := mtq.Querier.GetDeviceDataByDeviceID(ctx.Request().Context(), deviceId)
	if err != nil {
		fmt.Printf("error fetching device data for device %v: %v\n", deviceId, err)
		return make(map[string]*ActiveChannelDto)
	}

	fmt.Printf("GetDevicePlaylistItems: Found %d rows for device %v\n", len(rows), deviceId)

	// Structuring the data
	channelMap := make(map[string]*ActiveChannelDto)
	for _, row := range rows {
		// Skip rows where channel_id is null (device has no channel assigned)
		if !row.ChannelID.Valid {
			continue
		}

		channelID := utils.UuidBytesToString(row.ChannelID.Bytes) // Convert pgtype.UUID to string

		ch, exists := channelMap[channelID]
		if !exists {
			ch = &ActiveChannelDto{
				ID:   channelID,       // Use string instead of pgtype.UUID
				Name: row.ChannelName, // ChannelName is not nullable now (INNER JOIN)
			}
			channelMap[channelID] = ch
		}

		// If no schedule data, skip to next row but keep the channel
		if !row.ScheduleID.Valid {
			continue
		}

		// Parse layout data first (needed for both new and existing schedules)
		var layout *LayoutDto
		if row.LayoutID.Valid {
			layoutName := ""
			if row.LayoutName != nil {
				layoutName = *row.LayoutName
			}

			var zones map[string]interface{}
			if row.LayoutZones != nil {
				// First try to parse as array (database format)
				var zoneArray []map[string]interface{}
				if err := json.Unmarshal(row.LayoutZones, &zoneArray); err == nil {
					// Convert array to object with zone IDs as keys
					zones = make(map[string]interface{})
					for _, zone := range zoneArray {
						// Try to get zone identifier - prefer "id" but fallback to "name"
						var zoneKey string
						if zoneId, ok := zone["id"].(string); ok {
							zoneKey = zoneId
						} else if zoneName, ok := zone["name"].(string); ok {
							zoneKey = zoneName
						}

						if zoneKey != "" {
							// Convert percentage strings to numbers for simulator
							if width, ok := zone["width"].(string); ok && width == "100%" {
								zone["width"] = 100
							}
							if height, ok := zone["height"].(string); ok && height == "100%" {
								zone["height"] = 100
							}
							zones[zoneKey] = zone
						}
					}
					fmt.Printf("Parsed %d zones from array for layout %v\n", len(zones), row.LayoutID)
				} else {
					// Fallback: try parsing as object
					if err := json.Unmarshal(row.LayoutZones, &zones); err != nil {
						fmt.Printf("Failed to parse layout zones for layout %v: %v\n", row.LayoutID, err)
						zones = make(map[string]interface{}) // Empty zones if parsing fails
					} else {
						fmt.Printf("Parsed zones as object for layout %v\n", row.LayoutID)
					}
				}
			} else {
				fmt.Printf("Layout zones is null for layout %v\n", row.LayoutID)
				zones = make(map[string]interface{}) // Empty zones if null
			}

			layout = &LayoutDto{
				ID:    row.LayoutID,
				Name:  layoutName,
				Zones: zones,
			}
			fmt.Printf("Created layout object: ID=%v, Name='%s', Zones=%v\n", row.LayoutID, layoutName, zones)
		} else {
			fmt.Printf("Layout ID is not valid\n")
		}

		// Find or create the schedule
		var schedule *ChannelScheduleDto
		for i := range ch.Schedules {
			if ch.Schedules[i].ID == row.ScheduleID {
				schedule = &ch.Schedules[i]
				// Update existing schedule's layout data if it's missing
				if schedule.Playlist.Layout == nil && layout != nil {
					schedule.Playlist.Layout = layout
					schedule.Playlist.LayoutID = row.LayoutID
				}
				break
			}
		}

		if schedule == nil {
			startTime := ""
			if row.StartDatetime != nil {
				startTime = *row.StartDatetime
			}
			endTime := ""
			if row.EndDatetime != nil {
				endTime = *row.EndDatetime
			}
			playlistName := ""
			if row.PlaylistName != nil {
				playlistName = *row.PlaylistName
			}

			newSchedule := ChannelScheduleDto{
				ID:        row.ScheduleID,
				StartTime: startTime,
				EndTime:   endTime,
				Playlist: Playlist{
					ID:       row.PlaylistID,
					Name:     playlistName,
					LayoutID: row.LayoutID,
					Layout:   layout,
				},
			}
			ch.Schedules = append(ch.Schedules, newSchedule)
			schedule = &ch.Schedules[len(ch.Schedules)-1]
		}

		// Skip if no playlist item data
		if !row.ItemID.Valid {
			continue
		}

		// Handle nullable playlist item fields
		order := int32(0)
		if row.Order != nil {
			order = *row.Order
		}
		layoutPosition := int32(0)
		if row.LayoutPosition != nil {
			layoutPosition = *row.LayoutPosition
		}
		timeString := ""
		if row.Timestring != nil {
			timeString = *row.Timestring
		}
		isActive := false
		if row.IsActive != nil {
			isActive = *row.IsActive
		}
		contentID := ""
		if row.ContentID != nil {
			contentID = *row.ContentID
		}

		// Append the playlist item
		schedule.Playlist.Items = append(schedule.Playlist.Items, PlaylistItemDto{
			ID:             row.ItemID,
			Order:          order,
			LayoutPosition: layoutPosition,
			TimeString:     timeString,
			IsActive:       isActive,
			ContentID:      contentID,
		})
	}

	// Access the structured data
	for _, ch := range channelMap {
		for i := range ch.Schedules {
			buildZonePlayback(&ch.Schedules[i])
		}
		fmt.Printf("ActiveChannelDto: %+v\n", ch)
	}
	return channelMap
}

func (s *DeviceDisplayService) GetDevicesPlaylistItems(ctx echo.Context, deviceIds []pgtype.UUID) map[string]map[string]*ActiveChannelDto {
	// Use tenant-aware queries
	mtq, err := db.NewMultiTenantQuerierByContext(ctx, s.dbPool)
	if err != nil {
		fmt.Printf("error creating tenant querier: %v\n", err)
		return make(map[string]map[string]*ActiveChannelDto)
	}

	// Call the new query that handles multiple device IDs
	rows, err := mtq.Querier.GetDevicesDataByDevicesID(ctx.Request().Context(), deviceIds)
	if err != nil {
		fmt.Printf("error fetching device data for devices: %v\n", err)
		return make(map[string]map[string]*ActiveChannelDto)
	}

	fmt.Printf("GetDevicesPlaylistItems: Found %d rows for %d devices\n", len(rows), len(deviceIds))

	// Structuring the data
	deviceChannelMap := make(map[string]map[string]*ActiveChannelDto)

	for _, row := range rows {
		// Skip rows where channel_id is null
		if !row.ChannelID.Valid {
			continue
		}

		// Convert device ID and channel ID to string
		deviceID := utils.UuidBytesToString(row.DeviceID.Bytes)
		channelID := utils.UuidBytesToString(row.ChannelID.Bytes)

		// Check if the device already exists in the map
		if _, exists := deviceChannelMap[deviceID]; !exists {
			deviceChannelMap[deviceID] = make(map[string]*ActiveChannelDto)
		}

		ch, exists := deviceChannelMap[deviceID][channelID]
		if !exists {
			ch = &ActiveChannelDto{
				ID:   channelID,       // Use string instead of pgtype.UUID
				Name: row.ChannelName, // Not nullable now
			}
			deviceChannelMap[deviceID][channelID] = ch
		}

		// Skip if no schedule data
		if !row.ScheduleID.Valid {
			continue
		}

		// Parse layout data first (needed for both new and existing schedules)
		var layout *LayoutDto
		if row.LayoutID.Valid {
			layoutName := ""
			if row.LayoutName != nil {
				layoutName = *row.LayoutName
			}

			var zones map[string]interface{}
			if row.LayoutZones != nil {
				// First try to parse as array (database format)
				var zoneArray []map[string]interface{}
				if err := json.Unmarshal(row.LayoutZones, &zoneArray); err == nil {
					// Convert array to object with zone IDs as keys
					zones = make(map[string]interface{})
					for _, zone := range zoneArray {
						// Try to get zone identifier - prefer "id" but fallback to "name"
						var zoneKey string
						if zoneId, ok := zone["id"].(string); ok {
							zoneKey = zoneId
						} else if zoneName, ok := zone["name"].(string); ok {
							zoneKey = zoneName
						}

						if zoneKey != "" {
							// Convert percentage strings to numbers for simulator
							if width, ok := zone["width"].(string); ok && width == "100%" {
								zone["width"] = 100
							}
							if height, ok := zone["height"].(string); ok && height == "100%" {
								zone["height"] = 100
							}
							zones[zoneKey] = zone
						}
					}
					fmt.Printf("Parsed %d zones from array for layout %v\n", len(zones), row.LayoutID)
				} else {
					// Fallback: try parsing as object
					if err := json.Unmarshal(row.LayoutZones, &zones); err != nil {
						fmt.Printf("Failed to parse layout zones for layout %v: %v\n", row.LayoutID, err)
						zones = make(map[string]interface{}) // Empty zones if parsing fails
					} else {
						fmt.Printf("Parsed zones as object for layout %v\n", row.LayoutID)
					}
				}
			} else {
				fmt.Printf("Layout zones is null for layout %v\n", row.LayoutID)
				zones = make(map[string]interface{}) // Empty zones if null
			}

			layout = &LayoutDto{
				ID:    row.LayoutID,
				Name:  layoutName,
				Zones: zones,
			}
			fmt.Printf("Created layout object: ID=%v, Name='%s', Zones=%v\n", row.LayoutID, layoutName, zones)
		} else {
			fmt.Printf("Layout ID is not valid\n")
		}

		// Find or create the schedule
		var schedule *ChannelScheduleDto
		for i := range ch.Schedules {
			if ch.Schedules[i].ID == row.ScheduleID {
				schedule = &ch.Schedules[i]
				// Update existing schedule's layout data if it's missing
				if schedule.Playlist.Layout == nil && layout != nil {
					schedule.Playlist.Layout = layout
					schedule.Playlist.LayoutID = row.LayoutID
				}
				break
			}
		}

		if schedule == nil {
			startTime := ""
			if row.StartDatetime != nil {
				startTime = *row.StartDatetime
			}
			endTime := ""
			if row.EndDatetime != nil {
				endTime = *row.EndDatetime
			}
			playlistName := ""
			if row.PlaylistName != nil {
				playlistName = *row.PlaylistName
			}

			newSchedule := ChannelScheduleDto{
				ID:        row.ScheduleID,
				StartTime: startTime,
				EndTime:   endTime,
				Playlist: Playlist{
					ID:       row.PlaylistID,
					Name:     playlistName,
					LayoutID: row.LayoutID,
					Layout:   layout,
				},
			}
			ch.Schedules = append(ch.Schedules, newSchedule)
			schedule = &ch.Schedules[len(ch.Schedules)-1]
		}

		// Skip if no playlist item data
		if !row.ItemID.Valid {
			continue
		}

		// Handle nullable playlist item fields
		order := int32(0)
		if row.Order != nil {
			order = *row.Order
		}
		layoutPosition := int32(0)
		if row.LayoutPosition != nil {
			layoutPosition = *row.LayoutPosition
		}
		timeString := ""
		if row.Timestring != nil {
			timeString = *row.Timestring
		}
		isActive := false
		if row.IsActive != nil {
			isActive = *row.IsActive
		}
		contentID := ""
		if row.ContentID != nil {
			contentID = *row.ContentID
		}

		// Append the playlist item
		schedule.Playlist.Items = append(schedule.Playlist.Items, PlaylistItemDto{
			ID:             row.ItemID,
			Order:          order,
			LayoutPosition: layoutPosition,
			TimeString:     timeString,
			IsActive:       isActive,
			ContentID:      contentID,
		})
	}

	//// Access the structured data
	//for deviceID, channels := range deviceChannelMap {
	//	fmt.Printf("Device ID: %s\n", deviceID)
	//	for _, ch := range channels {
	//		fmt.Printf("ActiveChannelDto: %+v\n", ch)
	//	}
	//}
	for _, channels := range deviceChannelMap {
		for _, ch := range channels {
			for i := range ch.Schedules {
				buildZonePlayback(&ch.Schedules[i])
			}
		}
	}

	return deviceChannelMap
}
