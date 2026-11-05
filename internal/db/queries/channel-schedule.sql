
-- name: InsertChannelSchedule :copyfrom
INSERT INTO channel_schedule (start_datetime, end_datetime, channel_id, playlist_id, day)
VALUES ($1, $2, $3, $4, $5);

-- name: GetChannelScheduleByID :one
SELECT id, start_datetime, end_datetime, channel_id, playlist_id, day, created_at, updated_at
FROM channel_schedule
WHERE id = $1;

-- name: GetChannelSchedulesByChannelID :many
SELECT id, start_datetime, end_datetime, channel_id, playlist_id, day, created_at, updated_at
FROM channel_schedule
WHERE channel_id = $1;

-- name: UpdateChannelSchedule :exec
UPDATE channel_schedule
SET start_datetime = $2, end_datetime = $3, channel_id = $4, playlist_id = $5, day = $6
WHERE id = $1;

-- name: DeleteChannelSchedule :exec
DELETE FROM channel_schedule
WHERE id = $1;

-- name: DeleteSchedulesByChannelID :exec
DELETE FROM channel_schedule
WHERE channel_id = $1;

-- name: GetChannelsByPlaylistID :many
SELECT DISTINCT c.id, c.name, c.created_at, c.updated_at
FROM channel c
INNER JOIN channel_schedule cs ON c.id = cs.channel_id
WHERE cs.playlist_id = $1
ORDER BY c.name;