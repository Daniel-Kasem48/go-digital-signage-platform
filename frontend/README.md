# Frontend Dashboard (React + TypeScript + Tailwind)

This frontend provides a management dashboard for the Digital Signage backend.

## Architecture

Feature-based structure with reusable UI and data patterns:

- `src/app`: app shell and layout primitives
- `src/pages`: page containers
- `src/features`: feature-level hooks and components
- `src/entities`: domain entities and repositories
- `src/shared`: shared utilities and API types

Design patterns used:

- App Shell pattern (`AppShell`, `Sidebar`, `Topbar`)
- Repository pattern (`DashboardRepository`)
- Container/Presentational split (`DashboardPage` + feature components)
- Config-driven rendering (stats/action cards)

## Authentication Flow

Frontend uses tenant-scoped API access from environment variables:

- Frontend login screen is removed.
- Protected `/api/*` routes are called with:
  - `X-Tenant-ID: <tenant>`
- API connection/auth values are read from `VITE_API_*` in `frontend/.env`.

## Environment

Copy and adjust environment values from `.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_API_TENANT_ID=test_schema
VITE_ENABLE_MOCK_FALLBACK=false
```

`VITE_ENABLE_MOCK_FALLBACK` is optional and defaults to `false`. Set it to `true` only for UI-only local development.

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```
