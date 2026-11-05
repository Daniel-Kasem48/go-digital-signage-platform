-- name: CreateDeviceGroup :exec
INSERT INTO device_group (name)
VALUES ($1)
RETURNING id, name, created_at, updated_at;

-- name: GetDeviceGroup :one
SELECT id, name, created_at, updated_at
FROM device_group
WHERE id = $1;

-- name: ListDeviceGroups :many
SELECT id, name, created_at, updated_at
FROM device_group;

-- name: UpdateDeviceGroup :exec
UPDATE device_group
SET name = $2
WHERE id = $1;

-- name: DeleteDeviceGroup :exec
DELETE FROM device_group
WHERE id = $1;
