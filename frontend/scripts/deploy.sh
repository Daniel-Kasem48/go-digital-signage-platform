#!/usr/bin/env bash
set -euo pipefail

: "${APP_IMAGE:?APP_IMAGE is required}"
: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${DEPLOY_ENV_FILE:?DEPLOY_ENV_FILE is required}"
: "${DEPLOY_SSH_PRIVATE_KEY:?DEPLOY_SSH_PRIVATE_KEY is required}"

APP_CONTAINER_NAME="${APP_CONTAINER_NAME:-digital-signage-dashboard}"
APP_PORT="${APP_PORT:-4022}"

mkdir -p ~/.ssh
chmod 700 ~/.ssh
printf '%s\n' "$DEPLOY_SSH_PRIVATE_KEY" | tr -d '\r' > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa

if [ -n "${DEPLOY_KNOWN_HOSTS:-}" ]; then
  printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > ~/.ssh/known_hosts
  chmod 644 ~/.ssh/known_hosts
else
  ssh-keyscan -H "$DEPLOY_HOST" >> ~/.ssh/known_hosts
fi

ssh "$DEPLOY_USER@$DEPLOY_HOST" "bash -s" -- \
  "$APP_IMAGE" \
  "$DEPLOY_ENV_FILE" \
  "$APP_CONTAINER_NAME" \
  "$APP_PORT" \
  "${DEPLOY_REGISTRY:-}" \
  "${DEPLOY_REGISTRY_USER:-}" \
  "${DEPLOY_REGISTRY_PASSWORD:-}" <<'REMOTE_SCRIPT'
set -euo pipefail

APP_IMAGE="$1"
DEPLOY_ENV_FILE="$2"
APP_CONTAINER_NAME="$3"
APP_PORT="$4"
DEPLOY_REGISTRY="$5"
DEPLOY_REGISTRY_USER="$6"
DEPLOY_REGISTRY_PASSWORD="$7"

if [ -n "$DEPLOY_REGISTRY" ] && [ -n "$DEPLOY_REGISTRY_USER" ] && [ -n "$DEPLOY_REGISTRY_PASSWORD" ]; then
  echo "$DEPLOY_REGISTRY_PASSWORD" | docker login "$DEPLOY_REGISTRY" -u "$DEPLOY_REGISTRY_USER" --password-stdin
fi

docker pull "$APP_IMAGE"

if docker ps -a --format '{{.Names}}' | grep -Fxq "$APP_CONTAINER_NAME"; then
  docker rm -f "$APP_CONTAINER_NAME"
fi

docker run -d \
  --name "$APP_CONTAINER_NAME" \
  --restart unless-stopped \
  --env-file "$DEPLOY_ENV_FILE" \
  -p "$APP_PORT:80" \
  "$APP_IMAGE"
REMOTE_SCRIPT
