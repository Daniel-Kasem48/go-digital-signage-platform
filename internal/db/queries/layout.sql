-- name: CreateLayout :one
INSERT INTO layout (name, zones)
VALUES ($1, $2)
    RETURNING id, name, zones, created_at, updated_at;

-- name: GetLayoutByID :one
SELECT id, name, zones, created_at, updated_at
FROM layout
WHERE id = $1;

-- name: ListLayouts :many
SELECT id, name, zones, created_at, updated_at
FROM layout
ORDER BY created_at DESC
--     LIMIT $1 OFFSET $2;
;

-- name: UpdateLayout :one
UPDATE layout
SET name = $2, zones = $3, updated_at = now()
WHERE id = $1
    RETURNING id, name, zones, created_at, updated_at;

-- name: DeleteLayout :exec
DELETE FROM layout
WHERE id = $1;
