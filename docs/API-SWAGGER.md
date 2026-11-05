# API Documentation (Swagger)

## Live Swagger UI

When the server is running, open:

- `/swagger/index.html`

Example:

- `http://localhost:8080/swagger/index.html`

## Auth for documented endpoints

Current documented routes are under `/api/websocket-test/*` and require Basic Auth:

- Username: `BASIC_AUTH_USERNAME`
- Password: `BASIC_AUTH_PASSWORD`
- Header: `X-Tenant-ID: public` (or your tenant)

## Current coverage

Initial Swagger coverage includes:

- `POST /api/websocket-test/{deviceId}/content-sync`
- `POST /api/websocket-test/{deviceId}/device-assigned`
- `POST /api/websocket-test/{deviceId}/custom`

For the full mounted route inventory, see:

- `docs/API-ENDPOINTS.md`

## How to extend docs

1. Add Swagger annotations above controller handlers:
   - `@Summary`, `@Description`, `@Tags`
   - `@Param`, `@Success`, `@Failure`, `@Router`
2. If your environment has network/tooling, regenerate using `swag`:
   - `swag init -g cmd/digital-signage/main.go -o docs/swagger`

In this repository, `docs/swagger/docs.go` is currently maintained manually to keep Swagger available even when the `swag` CLI is unavailable.
