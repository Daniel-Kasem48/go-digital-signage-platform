# WebSocket Integration for Digital Signage Device Simulator

## Overview

The device simulator has been enhanced with WebSocket connectivity to enable real-time content updates and device communication with the digital signage backend.

## Key Features Added

### 1. WebSocket Connection Management
- **Connection**: Automatic WebSocket connection to `ws://localhost:8080/ws` after device registration
- **Reconnection**: Automatic reconnection with exponential backoff (max 5 attempts)
- **Status Tracking**: Real-time WebSocket connection status in the UI

### 2. Device Registration Protocol
- **Room Joining**: Device automatically joins its specific room (`device_${deviceId}`)
- **Server Registration**: Sends device registration message to WebSocket server
- **Status Updates**: Real-time status updates through WebSocket messages

### 3. Real-time Content Synchronization
- **Content Sync**: Listens for `content-sync` messages from server
- **Device Assignment**: Responds to `device-assigned` messages
- **Template Content**: Supports template-based content rendering
- **Media Content**: Supports image and video content display

### 4. WebSocket Message Handling

#### Supported Actions:
- `register-device`: Device registration with server
- `device-registered`: Confirmation from server
- `device-assigned`: Channel/content assignment notification
- `content-sync`: Real-time content updates
- `join-room`: Room management for targeted messaging
- `room-joined`: Room join confirmation

## UI Enhancements

### Status Bar Updates
```
Device: [Device-ID] | Status: [Device Status] | WS: [WebSocket Status] | IP: 127.0.0.1
```

### WebSocket Status Indicators:
- **Disconnected**: No WebSocket connection
- **Connecting...**: Attempting to connect
- **Connected**: Successfully connected and registered
- **Error**: Connection error occurred

## Usage Instructions

### 1. Start the Digital Signage Server
```bash
# In the digital-signage directory
go run ./cmd/digital-signage
```

### 2. Start Local HTTP Server for Simulator
```bash
python3 -m http.server 3000
```

### 3. Access Device Simulator
Open: `http://localhost:3000/device-simulator.html`

### 4. Register or Simulate Device
- **Option A**: Click "Register Device" with a new device identifier
- **Option B**: Click "Simulate Existing Device" for testing

### 5. Monitor WebSocket Connection
- Check the **WS** status in the status bar
- Toggle **Logs** to see detailed WebSocket communication
- Look for messages like:
  ```
  [timestamp] WebSocket connected successfully
  [timestamp] Sent device registration to WebSocket server
  [timestamp] Joined device room: device_[device-id]
  ```

## Testing Real-time Content Updates

### 1. Set up Device Infrastructure
```bash
./simple-content-workflow.sh
```

### 2. Publish Content with WebSocket Notifications
```bash
./complete-content-publish.sh
```

### 3. Verify WebSocket Integration
```bash
./test-websocket-integration.sh
```

## WebSocket Protocol Details

### Device Registration Message
```json
{
  "action": "register-device",
  "message": {
    "deviceId": "device-uuid",
    "identifier": "DEVICE-CODE"
  }
}
```

### Room Join Message
```json
{
  "action": "join-room",
  "message": {
    "room": "device_[device-uuid]"
  }
}
```

### Content Sync Message (Server → Device)
```json
{
  "action": "content-sync",
  "message": {
    "contentData": {
      "type": "template",
      "config": {
        "title": "Content Title",
        "message": "Content Message",
        "backgroundColor": "#1a73e8",
        "textColor": "#ffffff"
      }
    }
  }
}
```

## Content Display Features

### Template Content
- Dynamic HTML generation with customizable colors, fonts, and layout
- Animated content transitions (fade-in, slide effects)
- Configurable display duration
- Real-time timestamp display

### Media Content
- Support for images (PNG, JPG, SVG)
- Support for videos (MP4 with autoplay)
- Responsive content sizing (object-fit: contain)
- Automatic content cycling

## Troubleshooting

### WebSocket Connection Issues
1. **Check Server**: Ensure digital-signage server is running on port 8080
2. **Check Logs**: Toggle logs in simulator to see detailed error messages
3. **Browser Console**: Check browser developer console for WebSocket errors
4. **Firewall**: Ensure WebSocket port (8080) is accessible

### Device Registration Issues
1. **Unique Identifiers**: Use unique device identifiers
2. **Backend Authentication**: Verify backend basic auth is configured
3. **Database Connection**: Check if PostgreSQL database is running

### Content Display Issues
1. **Content Format**: Verify content data format matches expected schema
2. **CORS Policy**: Check if content URLs are accessible from simulator
3. **Template Validation**: Ensure template configurations are valid

## Next Steps

1. **Content Publishing API**: Fix template-based content creation issues
2. **Channel Schedule**: Resolve channel schedule creation for automated content rotation  
3. **Push Notifications**: Implement server-side WebSocket notifications when content is published
4. **Device Groups**: Add support for group-based content distribution
5. **Analytics**: Add WebSocket-based device activity tracking

## Files Modified/Created

- `device-simulator.html` - Enhanced with WebSocket connectivity
- `test-websocket-integration.sh` - Integration test script
- `WEBSOCKET-INTEGRATION.md` - This documentation

## Architecture Integration

```
┌─────────────────┐    WebSocket     ┌──────────────────┐
│ Device Simulator│ ←─────────────→  │ Digital Signage  │
│                 │   ws://8080/ws   │ WebSocket Server │
└─────────────────┘                  └──────────────────┘
         │                                      │
         │ HTTP API (Registration/Content)      │
         └──────────────────────────────────────┘
                   http://8080/api
```

The WebSocket integration provides the foundation for real-time content distribution, device management, and interactive digital signage experiences.