#!/bin/bash

# Loads AWS_KEY_ID / AWS_SECRET_KEY / AWS_BUCKET from .env if present
[ -f .env ] && set -a && . ./.env && set +a

# Start MinIO using docker-compose (only the minio service)
echo "Starting MinIO on port 9001..."
docker-compose up -d minio

# Wait for MinIO to start
echo "Waiting for MinIO to start..."
sleep 5

# Create the bucket
echo "Creating bucket '${AWS_BUCKET:-signage-dev}'..."
docker run --rm --network host \
  -e MC_HOST_minio=http://${AWS_KEY_ID:-minioadmin}:${AWS_SECRET_KEY:-change-me-please}@localhost:9001 \
  minio/mc mb minio/${AWS_BUCKET:-signage-dev}

echo "MinIO is ready! Access console at http://localhost:9002"
echo "Update your .env file to use AWS_ENDPOINT=http://127.0.0.1:9001"