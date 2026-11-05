#!/bin/sh
set -eu

log() {
  printf '[entrypoint] %s\n' "$1"
}

require_env() {
  var_name="$1"
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ]; then
    log "Missing required environment variable: $var_name"
    exit 1
  fi
}

normalize_host() {
  raw_host="$1"
  normalized_host="$raw_host"

  case "$raw_host" in
    \[*\]:[0-9]*)
      normalized_host="${raw_host%\]:*}"
      normalized_host="${normalized_host#[}"
      ;;
    *:[0-9]*)
      normalized_host="${raw_host%:*}"
      ;;
  esac

  printf '%s' "$normalized_host"
}

DB_PORT="${DB_PORT:-5432}"
APP_PORT="${APP_PORT:-8080}"
PG_MAINTENANCE_DB="${PG_MAINTENANCE_DB:-postgres}"

require_env DB_HOST
require_env DB_USER
require_env DB_PASSWORD
require_env DB_NAME

RAW_DB_HOST="$DB_HOST"
DB_HOST="$(normalize_host "$DB_HOST")"
if [ "$DB_HOST" != "$RAW_DB_HOST" ]; then
  log "Detected port in DB_HOST, using host '${DB_HOST}' with DB_PORT '${DB_PORT}'."
fi

export PGPASSWORD="$DB_PASSWORD"

log "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
  sleep 2
done

DB_EXISTS="$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$PG_MAINTENANCE_DB" -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")"
if [ "$DB_EXISTS" != "1" ]; then
  log "Database '${DB_NAME}' not found. Creating..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$PG_MAINTENANCE_DB" -c "CREATE DATABASE \"${DB_NAME}\""
else
  log "Database '${DB_NAME}' already exists."
fi

log "Running database migrations..."
GOOSE_DRIVER=postgres \
GOOSE_DBSTRING="host=${DB_HOST} port=${DB_PORT} user=${DB_USER} password=${DB_PASSWORD} dbname=${DB_NAME} sslmode=disable" \
goose -dir /app/schema/migrations up

log "Starting digital-signage on port ${APP_PORT}..."
exec "$@"
