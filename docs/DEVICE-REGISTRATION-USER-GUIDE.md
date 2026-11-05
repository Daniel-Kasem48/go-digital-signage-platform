# Device Registration Technical Guide

## Purpose
This document describes the actual backend registration flow used to onboard a device and make it playable in the signage system.

## Registration Architecture
- Device onboarding endpoints are under `POST /public/devices/*`.
- Tenant resolution is applied via `TenantMiddleware` on `/public`.
- Registration uses a challenge-response handshake:
1. create auth challenge
2. device computes challenge hash
3. backend validates hash and creates device
4. backend returns device + token

## Required Request Header
All registration requests must include:
- `X-Tenant-ID: <tenant-slug>`

Without tenant header, registration may resolve to fallback schema and register in the wrong tenant context.

## Endpoints

### 1. Create Auth Challenge
`POST /public/devices/auth-challenge`

Request:
```json
{
  "identifier": "device-serial-or-unique-id"
}
```

Response:
- `200 OK` with created auth challenge record (includes `identifier` and random `value`).

Validation:
- `identifier` is required.

### 2. Register Device
`POST /public/devices`

Request:
```json
{
  "identifier": "device-serial-or-unique-id",
  "challengeHash": "<hash-generated-on-device>",
  "version": "1.0.0",
  "ipAddress": "192.168.1.25"
}
```

Response:
- `200 OK`
```json
{
  "device": {
    "id": "...",
    "code": "...",
    "name": "DEVICE_0",
    "...": "..."
  },
  "token": "<device-token>"
}
```

Validation and failure cases:
- Missing fields => `400 Invalid input` or `400 Validation failed`
- Unknown identifier => `400 identifier not found`
- Invalid hash => `400 Challenge Hashed failed`

### 3. Assign Device (WebSocket signal)
`POST /public/devices/assign`

Request:
```json
{
  "code": "ABC123"
}
```

Behavior:
- Looks up device by code.
- Sends WebSocket message `device-assigned` to room `device_<device_uuid>`.

This is used when player side is waiting for assignment confirmation.

## Device List and Post-Registration Operations

### List Devices
`GET /api/devices`

Returns paginated list (tenant scoped).

### Delete Device
`DELETE /api/devices/:id`

Behavior:
- Sends a clear-content sync signal to device room.
- Deletes device record.

## Typical Sequence (Implementation)
1. Player calls `/public/devices/auth-challenge` with unique identifier.
2. Player calculates `challengeHash` from challenge value.
3. Player calls `/public/devices` with identifier + hash.
4. Backend creates device code and returns device token.
5. Dashboard loads device from `/api/devices`.
6. Operator assigns and publishes channel content.

## Curl Test Flow

### Create challenge
```bash
curl -sS -X POST "http://localhost:4021/public/devices/auth-challenge" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: public" \
  -d '{"identifier":"dev-001"}'
```

### Register device
Use the same identifier and computed hash:
```bash
curl -sS -X POST "http://localhost:4021/public/devices" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: public" \
  -d '{"identifier":"dev-001","challengeHash":"<hash>","version":"1.0.0","ipAddress":"127.0.0.1"}'
```

### Verify in device list
```bash
curl -sS "http://localhost:4021/api/devices?limit=20&offset=0" \
  -H "X-Tenant-ID: public"
```

## Troubleshooting

### `identifier not found`
- Challenge was not created for that identifier.
- Identifier mismatch between auth-challenge and register calls.

### `Challenge Hashed failed`
- Device hash algorithm/input does not match backend expectation.
- Ensure same challenge value and same secret/hashing method are used.

### Device not visible in dashboard
- Wrong tenant header used during registration.
- Device registered under different tenant/schema.

### Assignment message not received
- Device not connected to WebSocket room `device_<uuid>`.
- Device code used in `/assign` does not exist.

## Security Notes
- Registration endpoints are intentionally under `/public`, but still tenant-scoped.
- Device token should be stored securely on the player and rotated on reprovisioning.
- Avoid reusing identifiers across physical devices.

