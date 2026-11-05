-- name: ListPlaylistItems :many
SELECT id, "order", layout_position, timestring, is_active, content_id, playlist_id, created_at, updated_at
FROM playlist_item;

-- name: GetPlaylistItemById :one
SELECT id, "order", layout_position, timestring, is_active, content_id, playlist_id, created_at, updated_at
FROM playlist_item
WHERE id = $1;

-- name: GetPlaylistItemsByPlaylistId :many
SELECT id, "order", layout_position, timestring, is_active, content_id, playlist_id, created_at, updated_at
FROM playlist_item
WHERE playlist_id = $1;

-- name: CreatePlaylistItem :one
INSERT INTO playlist_item ("order", layout_position, timestring, is_active, content_id, playlist_id, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING id, "order", layout_position, timestring, is_active, content_id, playlist_id, created_at, updated_at;

-- name: UpdatePlaylistItem :exec
UPDATE playlist_item
SET "order" = $2, layout_position = $3, timestring = $4, is_active = $5, content_id = $6, playlist_id = $7, updated_at = NOW()
WHERE id = $1;

-- name: DeletePlaylistItem :exec
DELETE FROM playlist_item
WHERE id = $1;

-- name: DeletePlaylistItemByPlaylistId :exec
DELETE FROM playlist_item
WHERE playlist_id = $1;

-- name: GetLastPlaylistItemOrder :one
SELECT COALESCE(MAX("order"), 0) FROM playlist_item WHERE playlist_id = $1;

