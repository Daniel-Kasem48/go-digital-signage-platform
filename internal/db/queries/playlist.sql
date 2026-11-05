-- name: CreatePlaylist :one
INSERT INTO playlist (name, layout_id)
VALUES ($1, $2)
    RETURNING id, name, layout_id, created_at, updated_at;

-- name: GetPlaylistByID :one
SELECT id, name, layout_id, created_at, updated_at
FROM playlist
WHERE id = $1;

-- name: ListPlaylists :many
SELECT id, name, layout_id, created_at, updated_at
FROM playlist
ORDER BY name;

-- name: UpdatePlaylist :exec
UPDATE playlist
SET name = $2, layout_id = $3
WHERE id = $1;

-- name: DeletePlaylist :exec
DELETE FROM playlist
WHERE id = $1;
