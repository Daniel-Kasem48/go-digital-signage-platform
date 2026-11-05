-- name: GetAllChannels :many
SELECT id, name, description,   created_at, updated_at
FROM channel;

-- name: GetChannelById :one
SELECT id, name, description,   created_at, updated_at
FROM channel
WHERE id = $1;

-- name: CreateChannel :one
INSERT INTO channel ( name, description,  created_at, updated_at)
VALUES ( $1, $2, NOW(), NOW())
    RETURNING id, name, description,  created_at, updated_at;

-- name: UpdateChannel :exec
UPDATE channel
SET name = $2, description = $3,   updated_at = NOW()
WHERE id = $1;

-- name: DeleteChannel :exec
DELETE FROM channel
WHERE id = $1;
