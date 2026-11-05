# API Endpoint Catalog

This is the complete endpoint inventory from current route registration in `cmd/digital-signage/main.go`.

## Auth Model

- `Public`: no Basic Auth (tenant middleware may still apply)
- `Basic + Tenant`: requires Basic Auth and `X-Tenant-ID`
- `Tenant`: requires `X-Tenant-ID`

## System

| Method | Path | Auth | Source |
|---|---|---|---|
| GET | `/swagger/*` | Public | `cmd/digital-signage/main.go` |
| GET | `/ws` | Public (JWT token query required by handler) | `internal/modules/socket/module.go` |

## Public API (`/public`)

| Method | Path | Auth | Source |
|---|---|---|---|
| GET | `/public/devices/list` | Tenant | `internal/modules/device/device.controller.go` |
| POST | `/public/devices` | Tenant | `internal/modules/device-registration/device-registration.controller.go` |
| POST | `/public/devices/assign` | Tenant | `internal/modules/device-registration/device-registration.controller.go` |
| POST | `/public/devices/auth-challenge` | Tenant | `internal/modules/device-registration/device-registration.controller.go` |
| POST | `/public/devices/test` | Tenant | `internal/modules/device-registration/device-registration.controller.go` |

## Auth API (`/api/auth`)

| Method | Path | Auth | Source |
|---|---|---|---|
| POST | `/api/auth/login` | Public | `internal/modules/auth/auth.controller.go` |
| POST | `/api/auth/logout` | Public | `internal/modules/auth/auth.controller.go` |
| POST | `/api/auth/refresh-token` | Public | `internal/modules/auth/auth.controller.go` |
| POST | `/api/auth/signup` | Public | `internal/modules/auth/auth.controller.go` |

## Backend API (`/api`) - Basic Auth + Tenant

| Method | Path | Auth | Source |
|---|---|---|---|
| POST | `/api/files` | Basic + Tenant | `internal/modules/file/file.controller.go` |
| GET | `/api/files/*` | Basic + Tenant | `internal/modules/file/file.controller.go` |
| POST | `/api/files/bucket/public` | Basic + Tenant | `internal/modules/file/file.controller.go` |
| GET | `/api/layouts` | Basic + Tenant | `internal/modules/layout/layout.controller.go` |
| GET | `/api/layouts/:id` | Basic + Tenant | `internal/modules/layout/layout.controller.go` |
| POST | `/api/layouts` | Basic + Tenant | `internal/modules/layout/layout.controller.go` |
| PUT | `/api/layouts/:id` | Basic + Tenant | `internal/modules/layout/layout.controller.go` |
| DELETE | `/api/layouts/:id` | Basic + Tenant | `internal/modules/layout/layout.controller.go` |
| GET | `/api/templates` | Basic + Tenant | `internal/modules/template/template.controller.go` |
| POST | `/api/templates` | Basic + Tenant | `internal/modules/template/template.controller.go` |
| GET | `/api/playlist-items` | Basic + Tenant | `internal/modules/playlist-item/playlist-item.controller.go` |
| POST | `/api/playlist-items` | Basic + Tenant | `internal/modules/playlist-item/playlist-item.controller.go` |
| PUT | `/api/playlist-items/:id` | Basic + Tenant | `internal/modules/playlist-item/playlist-item.controller.go` |
| DELETE | `/api/playlist-items/:id` | Basic + Tenant | `internal/modules/playlist-item/playlist-item.controller.go` |
| GET | `/api/channels/:id/schedules` | Basic + Tenant | `internal/modules/channel-schedule/channel-schedule.controller.go` |
| POST | `/api/channels/:id/schedules` | Basic + Tenant | `internal/modules/channel-schedule/channel-schedule.controller.go` |
| POST | `/api/channel-schedules` | Basic + Tenant | `internal/modules/channel-schedule/channel-schedule.controller.go` |
| DELETE | `/api/channel-schedules/:id` | Basic + Tenant | `internal/modules/channel-schedule/channel-schedule.controller.go` |
| GET | `/api/devices/:id/display` | Basic + Tenant | `internal/modules/device-display/device-display.controller.go` |
| GET | `/api/devices` | Basic + Tenant | `internal/modules/device/device.controller.go` |
| DELETE | `/api/devices/:id` | Basic + Tenant | `internal/modules/device/device.controller.go` |
| GET | `/api/contents` | Basic + Tenant | `internal/modules/content/content.controller.go` |
| POST | `/api/contents` | Basic + Tenant | `internal/modules/content/content.controller.go` |
| POST | `/api/contents/media` | Basic + Tenant | `internal/modules/content/content.controller.go` |
| GET | `/api/channels` | Basic + Tenant | `internal/modules/channel/channel.controller.go` |
| GET | `/api/channels/:id` | Basic + Tenant | `internal/modules/channel/channel.controller.go` |
| POST | `/api/channels` | Basic + Tenant | `internal/modules/channel/channel.controller.go` |
| POST | `/api/channels/:id/publish` | Basic + Tenant | `internal/modules/channel/channel.controller.go` |
| GET | `/api/playlists` | Basic + Tenant | `internal/modules/playlist/playlist.controller.go` |
| GET | `/api/playlists/:id` | Basic + Tenant | `internal/modules/playlist/playlist.controller.go` |
| POST | `/api/playlists` | Basic + Tenant | `internal/modules/playlist/playlist.controller.go` |
| PUT | `/api/playlists/:id` | Basic + Tenant | `internal/modules/playlist/playlist.controller.go` |
| DELETE | `/api/playlists/:id` | Basic + Tenant | `internal/modules/playlist/playlist.controller.go` |
| GET | `/api/device-groups` | Basic + Tenant | `internal/modules/device-group/device-group.controller.go` |
| POST | `/api/device-groups` | Basic + Tenant | `internal/modules/device-group/device-group.controller.go` |
| GET | `/api/users` | Basic + Tenant | `internal/modules/user/user.controller.go` |
| POST | `/api/users` | Basic + Tenant | `internal/modules/user/user.controller.go` |
| DELETE | `/api/users` | Basic + Tenant | `internal/modules/user/user.controller.go` |
| POST | `/api/websocket-test/:deviceId/content-sync` | Basic + Tenant | `internal/modules/websocket-test/websocket-test.controller.go` |
| POST | `/api/websocket-test/:deviceId/device-assigned` | Basic + Tenant | `internal/modules/websocket-test/websocket-test.controller.go` |
| POST | `/api/websocket-test/:deviceId/custom` | Basic + Tenant | `internal/modules/websocket-test/websocket-test.controller.go` |

## Cloud/Static Routes

| Method | Path | Auth | Source |
|---|---|---|---|
| GET | `/cloud/contents/:id/model.json` | Tenant | `cmd/digital-signage/main.go` + `internal/modules/content/content.controller.go` |
| GET | `/cloud/contents/*` | Tenant (middleware-driven file service behavior) | `cmd/digital-signage/main.go` |
| POST | `/cloud/files/files` | Tenant | `internal/modules/file/file.controller.go` |
| GET | `/cloud/files/files/*` | Tenant | `internal/modules/file/file.controller.go` |

## Notes

- Some controllers contain `RegisterRoutes` functions that are not mounted in `main` for production routing.
- Swagger UI is available at `/swagger/index.html`; this catalog is the current complete route list while incremental Swagger annotations are expanded across modules.
