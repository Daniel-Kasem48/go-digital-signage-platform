# Digital Signage API Documentation

## Overview
This document provides comprehensive API documentation for the Digital Signage system. All API endpoints are RESTful and use JSON for request/response bodies (except file uploads).

## Base URL
```
http://localhost:8080
```

## Authentication

### Types of Authentication

1. **Public Routes** (`/public/*`) - No authentication required
2. **Backend Routes** (`/api/*`) - Basic Authentication required
3. **Device Routes** - Device token authentication

### Basic Authentication
For backend-to-backend communication:
```bash
Authorization: Basic base64(username:password)
# Example: Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
```

Default credentials:
- Username: `backend_user`
- Password: `backend_password`

### Headers Required
```bash
X-Tenant-ID: test_schema  # Required for multi-tenant isolation
Content-Type: application/json  # For JSON payloads
```

---

## 1. Device Management

### Device Registration Flow

#### 1.1 Request Authentication Challenge
**POST** `/public/devices/auth-challenge`

Request:
```json
{
  "identifier": "DEVICE-001"  // Unique device identifier
}
```

Response:
```json
{
  "value": "challenge_string",
  "expires_at": "2025-08-25T12:00:00Z"
}
```

#### 1.2 Register Device
**POST** `/public/devices`

Request:
```json
{
  "identifier": "DEVICE-001",
  "challengeHash": "sha256_hash_of_challenge",  // SHA256(challenge + derived_key)
  "version": "1.0.0",  // Optional: device software version
  "ipAddress": "192.168.1.100"  // Optional: device IP
}
```

Response:
```json
{
  "device": {
    "id": "14996b09-e358-4cbf-bd6d-583fc20805ba",
    "identifier": "DEVICE-001",
    "code": "#rC7I$",
    "name": "DEVICE_0",
    "orientation": "landscape",
    "created_at": "2025-08-25T10:00:00Z"
  },
  "token": "jwt_token_for_websocket_auth"
}
```

### Device Management Endpoints

#### 1.3 List All Devices
**GET** `/api/devices`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
```

Query Parameters:
- `offset` (default: 0) - Pagination offset
- `limit` (default: 25) - Items per page

Response:
```json
{
  "data": [
    {
      "id": "14996b09-e358-4cbf-bd6d-583fc20805ba",
      "name": "DEVICE_0",
      "code": "#rC7I$",
      "active_channel_id": "9d20df90-011c-435a-a465-534af50136ff",
      "orientation": "landscape",
      "ip_address": "192.168.1.100",
      "last_active_at": "2025-08-25T15:30:00Z"
    }
  ],
  "count": 10,
  "limit": 25,
  "offset": 0
}
```

#### 1.4 Get Device Display Data
**GET** `/api/devices/{deviceId}/display`

Returns structured display data including channel schedules, playlists, and **layout information** for zone-based content positioning.

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
```

Response:
```json
{
  "c3c3f501-15c4-4bba-b414-19dc48d9ecd2": {
    "ID": "c3c3f501-15c4-4bba-b414-19dc48d9ecd2",
    "Name": "Store Channel",
    "Schedules": [
      {
        "ID": "3aed3cee-34d4-442a-a2f8-fd7a4437139d",
        "StartTime": "00:00",
        "EndTime": "23:50",
        "Playlist": {
          "ID": "4481aa1e-ba21-4733-a4e2-2fce17ff5c0e",
          "Name": "Emergency Playlist",
          "LayoutID": "b1d1a938-f26a-4ee8-800e-89b28d708d73",
          "Layout": {
            "ID": "b1d1a938-f26a-4ee8-800e-89b28d708d73",
            "Name": "Full Screen Layout",
            "Zones": {
              "main": {
                "x": 0,
                "y": 0,
                "id": "main",
                "type": "content",
                "width": 100,
                "height": 100
              }
            }
          },
          "Items": [
            {
              "ID": "baac2823-478c-4426-96d1-200bcffce93e",
              "Order": 2,
              "LayoutPosition": 1,
              "TimeString": "10s",
              "IsActive": true,
              "ContentID": "58282aad-384e-4489-aaac-18965ea344f5_f21e66b1-058c-4dad-96c1-107523342dc3"
            },
            {
              "ID": "3ee8a6b2-3152-4437-875e-922b5373bca2", 
              "Order": 1,
              "LayoutPosition": 1,
              "TimeString": "100s",
              "IsActive": true,
              "ContentID": "image_50a2b9b8-ed25-4cdd-8343-54f890f7ee91"
            }
          ]
        }
      }
    ]
  }
}
```

**Layout Information:**
- **Layout**: Contains layout configuration with zones for content positioning
- **Zones**: Object with zone names as keys, containing positioning data (x, y, width, height)
- **LayoutPosition**: Item's target zone (1-based index corresponding to zone order)
- **Zone Format**: Converted from database array format to object format for easy access

**Usage for Device Simulators:**
1. Parse `Layout.Zones` to create visual zones on the display
2. Map `LayoutPosition` to specific zones for content placement  
3. Display content in the appropriate zone based on item's `LayoutPosition`

#### 1.5 Delete Device
**DELETE** `/api/devices/{deviceId}`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
```

Response: 204 No Content

---

## 2. Channel Management

### 2.1 List All Channels
**GET** `/api/channels`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
```

Response:
```json
[
  {
    "id": "9d20df90-011c-435a-a465-534af50136ff",
    "name": "Test Channel",
    "description": "Channel for testing",
    "created_at": "2025-08-25T09:59:31Z",
    "updated_at": "2025-08-25T09:59:31Z"
  }
]
```

### 2.2 Create Channel
**POST** `/api/channels`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: application/json
```

Request:
```json
{
  "name": "New Channel",
  "description": "Optional description"  // Optional
}
```

Response:
```json
{
  "id": "new-channel-uuid",
  "name": "New Channel",
  "description": "Optional description",
  "created_at": "2025-08-25T16:00:00Z",
  "updated_at": "2025-08-25T16:00:00Z"
}
```

### 2.3 Assign Channel to Devices (Publish)
**POST** `/api/channels/{channelId}/publish`

**⚠️ IMPORTANT: This triggers WebSocket content-sync event to devices**

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: application/json
```

Request:
```json
{
  "device_ids": [
    "14996b09-e358-4cbf-bd6d-583fc20805ba",
    "another-device-uuid"
  ]
}
```

Response:
```json
{}  // Empty object on success
```

WebSocket Event Sent to Devices:
```json
{
  "action": "content-sync",
  "message": {
    "activeChannel": {
      // Channel data with playlists and content
    }
  }
}
```

---

## 3. Content Management

### Content Types
The system supports three types of content:
- **template**: Dynamic content using predefined templates with JSON schema validation
- **image**: Static images (PNG, JPG, JPEG, GIF)
- **video**: Video files (MP4, AVI, MOV)

### 3.1 List All Content
**GET** `/api/contents`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
```

Query Parameters:
- `offset` (default: 0)
- `limit` (default: 25)

Response:
```json
{
  "data": [
    {
      "id": "template_123e4567-e89b-12d3-a456-426614174000",
      "name": "Welcome Screen",
      "content_type": "template",
      "schema": {
        "title": "Welcome",
        "subtitle": "To our store"
      },
      "template_id": "550e8400-e29b-41d4-a716-446655440000",
      "file_path": null,
      "created_at": "2025-08-25T10:00:00Z"
    },
    {
      "id": "image_789e0123-e89b-12d3-a456-426614174000",
      "name": "Company Logo",
      "content_type": "image",
      "schema": null,
      "template_id": null,
      "file_path": "content/uploads/logo.jpg",
      "created_at": "2025-08-25T11:00:00Z"
    }
  ],
  "count": 5,
  "limit": 25,
  "offset": 0
}
```

### 3.2 Create Template-Based Content
**POST** `/api/contents`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: application/json
```

Request:
```json
{
  "name": "New Template Content",
  "model": {
    // Data matching the template's JSON schema
    "title": "Welcome Screen",
    "subtitle": "Glad you're here",
    "backgroundColor": "#ffffff"
  },
  "template_id": "template-uuid"  // Required - must reference existing template
}
```

Response:
```json
{
  "id": "template_123e4567-e89b-12d3-a456-426614174000",
  "name": "New Template Content",
  "content_type": "template",
  "schema": {
    "title": "Welcome Screen",
    "subtitle": "Glad you're here",
    "backgroundColor": "#ffffff"
  },
  "template_id": "template-uuid",
  "file_path": null,
  "created_at": "2025-08-25T10:00:00Z"
}
```

### 3.3 Create Media Content (Images/Videos)
**POST** `/api/contents/media`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: application/json
```

Request:
```json
{
  "name": "Company Logo",
  "content_type": "image",  // Options: "image", "video"
  "temp_file_path": "temp/uploads/logo.jpg"  // Path from file upload
}
```

Supported formats:
- **Images**: .png, .jpg, .jpeg, .gif
- **Videos**: .mp4, .avi, .mov

Response:
```json
{
  "id": "image_789e0123-e89b-12d3-a456-426614174000",
  "name": "Company Logo",
  "content_type": "image",
  "schema": null,
  "template_id": null,
  "file_path": "content/uploads/logo.jpg",
  "created_at": "2025-08-25T11:00:00Z"
}
```

### 3.4 Get Content Model (Public)
**GET** `/cloud/contents/{contentId}/model.json`

Headers:
```bash
X-Tenant-ID: test_schema
```

Response:
```json
{
  // Content model configuration
}
```

---

## 4. Playlist Management

### 4.1 List All Playlists
**GET** `/api/playlists`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
```

### 4.2 Create Playlist
**POST** `/api/playlists`

Request:
```json
{
  "name": "Morning Playlist",
  "layoutId": "layout-uuid"
}
```

### 4.3 Update Playlist
**PUT** `/api/playlists/{playlistId}`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: application/json
```

Request:
```json
{
  "name": "Updated Playlist Name",
  "layoutId": "new-layout-uuid"
}
```

Response:
```json
{
  "id": "playlist-uuid",
  "name": "Updated Playlist Name",
  "layout_id": "new-layout-uuid",
  "created_at": "2025-08-25T10:00:00Z",
  "updated_at": "2025-08-28T16:00:00Z"
}
```

### 4.4 Add Item to Playlist
**POST** `/api/playlist-items`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: application/json
```

Request:
```json
{
  "layoutPosition": 1,  // Zone position (1-based index)
  "timestring": "10s",  // Duration
  "isActive": true,
  "contentId": "content-uuid",
  "playlistId": "playlist-uuid"
}
```

**Layout Position Validation Rules:**
- **No Layout Assigned**: Only position `1` allowed (full-screen content)
- **Layout with N Zones**: Positions `1` to `N` allowed (1-based indexing)
- **Invalid Position**: Returns `400 Bad Request` with detailed error message

Examples:
- Playlist with 1-zone layout → `layoutPosition: 1` ✅
- Playlist with 3-zone layout → `layoutPosition: 1|2|3` ✅  
- Playlist with 2-zone layout → `layoutPosition: 5` ❌ `400 Bad Request`

Response:
```json
{
  "id": "playlist-item-uuid",
  "order": 1,
  "layout_position": 1,
  "timestring": "10s",
  "is_active": true,
  "content_id": "content-uuid",
  "playlist_id": "playlist-uuid",
  "created_at": "2025-08-25T10:00:00Z",
  "updated_at": "2025-08-25T10:00:00Z"
}
```

Error Responses:
- **400 Bad Request**: Invalid layout position
  ```json
  {
    "message": "Invalid layout position: layout position 3 is invalid, must be between 1 and 2 (number of zones in layout 'Header Footer Layout')"
  }
  ```
- **400 Bad Request**: Playlist has no layout
  ```json
  {
    "message": "Invalid layout position: playlist has no layout assigned, layout position must be 1 for full-screen content"
  }
  ```

### 4.5 Update Playlist Item (Partial Updates Supported)
**PUT** `/api/playlist-items/{itemId}`

**Supports partial updates** - only provide the fields you want to update. Omitted fields will retain their current values.

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: application/json
```

Request (all fields are optional):
```json
{
  "order": 2,  // Optional: Display sequence
  "layoutPosition": 1,  // Optional: Zone position (validated against layout)
  "timestring": "15s",  // Optional: Updated duration
  "isActive": true,  // Optional: Active status
  "contentId": "content-uuid",  // Optional: Content reference
  "playlistId": "playlist-uuid"  // Optional: Playlist reference
}
```

**Layout Position Validation (when updating `layoutPosition`):**
- Same validation rules apply as in creation
- Position must be valid for the target playlist's layout
- Returns `400 Bad Request` if position is out of range

Example - Update only duration:
```json
{
  "timestring": "30s"
}
```

Example - Update layout position:
```json
{
  "layoutPosition": 2  // Must be valid for playlist's layout
}
```

Example - Update order and active status:
```json
{
  "order": 5,
  "isActive": false
}
```

Response:
```json
{
  "id": "playlist-item-uuid",
  "order": 2,
  "layout_position": 1,
  "timestring": "15s",
  "is_active": true,
  "content_id": "content-uuid",
  "playlist_id": "playlist-uuid",
  "created_at": "2025-08-25T10:00:00Z",
  "updated_at": "2025-08-28T16:00:00Z"
}
```

### 4.6 Delete Playlist Item
**DELETE** `/api/playlist-items/{itemId}`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
```

Response: 
```json
""
```

**Content Sync Events:**
- Automatically notifies affected devices when playlist items are created, updated, or deleted
- Devices receive real-time updates via WebSocket connections
- No manual sync required

---

## 5. Channel Schedules

### 5.1 Create Schedule for Channel
**POST** `/api/channels/{channelId}/schedules`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: application/json
```

Request:
```json
{
  "schedules": [
    {
      "start_datetime": "2025-08-25T09:00:00Z",
      "end_datetime": "2025-08-25T17:00:00Z",
      "channel_id": "channel-uuid",
      "playlist_id": "playlist-uuid",
      "day": 1  // 0=Sunday, 1=Monday, etc.
    }
  ]
}
```

### 5.2 Create Individual Schedule
**POST** `/api/channel-schedules`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: application/json
```

Request:
```json
{
  "start_datetime": "2025-08-25T09:00:00Z",
  "end_datetime": "2025-08-25T17:00:00Z",
  "channel_id": "channel-uuid",
  "playlist_id": "playlist-uuid",
  "day": 1  // 0=Sunday, 1=Monday, etc.
}
```

Response:
```json
{
  "message": "Schedule created successfully"
}
```

### 5.3 Delete Schedule
**DELETE** `/api/channel-schedules/{scheduleId}`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
```

Response:
```json
{
  "message": "Schedule deleted successfully"
}
```

### 5.4 List Channel Schedules
**GET** `/api/channels/{channelId}/schedules`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
```

Response:
```json
[
  {
    "id": "schedule-uuid",
    "start_datetime": "2025-08-25T09:00:00Z",
    "end_datetime": "2025-08-25T17:00:00Z",
    "channel_id": "channel-uuid",
    "playlist_id": "playlist-uuid",
    "day": 1,
    "created_at": "2025-08-25T10:00:00Z"
  }
]
```

---

## 6. File Upload

### 6.1 Upload File
**POST** `/api/files`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: multipart/form-data
```

Form Data:
- `file`: The file to upload

Response:
```json
{
  "object_name": "uploads/temp/filename.jpg"
}
```

---

## 7. Layout Management

The layout system supports zone-based display configurations, allowing you to divide the display area into multiple regions for different content.

### 7.1 List All Layouts
**GET** `/api/layouts`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
```

Response:
```json
[
  {
    "id": "layout-uuid",
    "name": "Main Display Layout",
    "zones": {
      "header": {
        "x": 0,
        "y": 0,
        "width": 100,
        "height": 20
      },
      "main": {
        "x": 0,
        "y": 20,
        "width": 70,
        "height": 60
      },
      "sidebar": {
        "x": 70,
        "y": 20,
        "width": 30,
        "height": 60
      },
      "footer": {
        "x": 0,
        "y": 80,
        "width": 100,
        "height": 20
      }
    },
    "created_at": "2025-08-25T10:00:00Z",
    "updated_at": "2025-08-25T10:00:00Z"
  }
]
```

### 7.2 Create Layout with Zones
**POST** `/api/layouts`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: application/json
```

Request:
```json
{
  "name": "Multi-Zone Display",
  "zones": {
    "header": {
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 15,
      "type": "text"
    },
    "content": {
      "x": 0,
      "y": 15,
      "width": 100,
      "height": 70,
      "type": "media"
    },
    "footer": {
      "x": 0,
      "y": 85,
      "width": 100,
      "height": 15,
      "type": "ticker"
    }
  }
}
```

Response:
```json
{
  "id": "new-layout-uuid",
  "name": "Multi-Zone Display",
  "zones": {
    "header": {
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 15,
      "type": "text"
    },
    "content": {
      "x": 0,
      "y": 15,
      "width": 100,
      "height": 70,
      "type": "media"
    },
    "footer": {
      "x": 0,
      "y": 85,
      "width": 100,
      "height": 15,
      "type": "ticker"
    }
  },
  "created_at": "2025-08-28T10:00:00Z",
  "updated_at": "2025-08-28T10:00:00Z"
}
```

#### Zone Configuration
- **zones**: JSON object defining display zones
- Each zone can have custom properties (coordinates, dimensions, type, etc.)
- Zones are stored as JSONB in the database for flexible configuration
- No fixed zone schema - allows for custom zone definitions per layout

### 7.3 Get Layout by ID
**GET** `/api/layouts/{layoutId}`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
```

Response:
```json
{
  "id": "layout-uuid",
  "name": "Main Display Layout",
  "zones": {
    "header": {
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 20
    },
    "main": {
      "x": 0,
      "y": 20,
      "width": 70,
      "height": 60
    },
    "sidebar": {
      "x": 70,
      "y": 20,
      "width": 30,
      "height": 60
    },
    "footer": {
      "x": 0,
      "y": 80,
      "width": 100,
      "height": 20
    }
  },
  "created_at": "2025-08-25T10:00:00Z",
  "updated_at": "2025-08-25T10:00:00Z"
}
```

Error Responses:
- **400 Bad Request**: Invalid layout ID format
- **404 Not Found**: Layout not found

### 7.4 Update Layout
**PUT** `/api/layouts/{layoutId}`

Headers:
```bash
Authorization: Basic YmFja2VuZF91c2VyOmJhY2tlbmRfcGFzc3dvcmQ=
X-Tenant-ID: test_schema
Content-Type: application/json
```

Request:
```json
{
  "name": "Updated Layout Name",
  "zones": {
    "header": {
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 25,
      "type": "banner"
    },
    "content": {
      "x": 0,
      "y": 25,
      "width": 100,
      "height": 75,
      "type": "media"
    }
  }
}
```

Response:
```json
{
  "id": "layout-uuid",
  "name": "Updated Layout Name",
  "zones": {
    "header": {
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 25,
      "type": "banner"
    },
    "content": {
      "x": 0,
      "y": 25,
      "width": 100,
      "height": 75,
      "type": "media"
    }
  },
  "created_at": "2025-08-25T10:00:00Z",
  "updated_at": "2025-09-07T16:30:00Z"
}
```

Error Responses:
- **400 Bad Request**: Invalid layout ID format or invalid input
- **404 Not Found**: Layout not found

#### Available Layout Operations
Currently implemented:
- ✅ **GET** `/api/layouts` - List all layouts
- ✅ **GET** `/api/layouts/{layoutId}` - Get layout by ID
- ✅ **POST** `/api/layouts` - Create new layout with zones
- ✅ **PUT** `/api/layouts/{layoutId}` - Update layout name and zones

Database supports but not yet implemented in API:
- ⏳ **DELETE** `/api/layouts/{layoutId}` - Delete layout

---

## 8. Template Management

### 8.1 List Templates
**GET** `/api/templates`

### 8.2 Create Template
**POST** `/api/templates`

Request:
```json
{
  "name": "Digital Menu Template",
  "storageKey": "templates/menu/index.html",
  "thumbnailStorageKey": "templates/menu/thumbnail.jpg"
}
```

---

## Common Workflows

### Workflow 1: Device Setup and Content Display

1. **Register Device**
   - POST `/public/devices/auth-challenge` - Get challenge
   - POST `/public/devices` - Register with challenge hash
   - Save device ID and token

2. **Create Channel**
   - POST `/api/channels` - Create new channel

3. **Create Content**
   - For template content:
     - POST `/api/contents` - Create template-based content
   - For media content:
     - POST `/api/files` - Upload media file
     - POST `/api/contents/media` - Create media content entry

4. **Create Playlist**
   - POST `/api/playlists` - Create playlist
   - POST `/api/playlist-items` - Add content to playlist

5. **Create Schedule** (Optional)
   - POST `/api/channels/{id}/schedules` - Set time-based schedules

6. **Assign Channel to Device**
   - POST `/api/channels/{id}/publish` - Triggers WebSocket sync

### Workflow 2: Update Device Content

1. **Modify Playlist**
   - POST `/api/playlist-items` - Add new items
   - DELETE `/api/playlist-items/{id}` - Remove items

2. **Trigger Update**
   - Currently manual: Re-publish channel to devices
   - TODO: Automatic WebSocket notifications on content changes

---

## WebSocket Integration

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8080/ws?token=' + deviceToken);
```

### Device Registration Message
```json
{
  "action": "register-device",
  "message": {
    "deviceId": "device-uuid",
    "identifier": "DEVICE-001"
  }
}
```

### Join Device Room
```json
{
  "action": "join-room",
  "message": {
    "room": "device_14996b09-e358-4cbf-bd6d-583fc20805ba"
  }
}
```

### Receive Content Sync
```json
{
  "action": "content-sync",
  "message": {
    "contentData": {
      "type": "template",
      "config": {
        // Content configuration
      }
    }
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid input: field validation failed"
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "message": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error message"
}
```

---

## Testing with cURL

### Example: Complete Device Setup
```bash
# 1. Get auth challenge
CHALLENGE=$(curl -s -X POST \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  http://localhost:8080/public/devices/auth-challenge \
  -d '{"identifier": "TEST-DEVICE"}' | jq -r '.value')

# 2. Register device (simplified - actual implementation needs proper hash)
DEVICE_RESPONSE=$(curl -s -X POST \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  http://localhost:8080/public/devices \
  -d '{
    "identifier": "TEST-DEVICE",
    "challengeHash": "'$CHALLENGE'",
    "version": "1.0.0"
  }')

DEVICE_ID=$(echo $DEVICE_RESPONSE | jq -r '.device.id')

# 3. Create channel
CHANNEL_ID=$(curl -s -X POST \
  -H "Authorization: Basic $(echo -n "backend_user:backend_password" | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  http://localhost:8080/api/channels \
  -d '{"name": "Test Channel"}' | jq -r '.id')

# 4. Assign channel to device
curl -X POST \
  -H "Authorization: Basic $(echo -n "backend_user:backend_password" | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  http://localhost:8080/api/channels/$CHANNEL_ID/publish \
  -d '{"device_ids": ["'$DEVICE_ID'"]}'
```

---

## Notes

1. **WebSocket Events**: Currently only triggered on channel assignment. TODOs exist for content/playlist updates.
2. **Tenant Isolation**: All requests require `X-Tenant-ID` header (currently hardcoded to "test_schema")
3. **Device Rooms**: Each device has its own WebSocket room using its UUID
4. **Content Sync**: Devices receive real-time updates via WebSocket `content-sync` events