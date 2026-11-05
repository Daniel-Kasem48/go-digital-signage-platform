-- name: CreateDevice :one
INSERT INTO device (name,code)
VALUES ($1,$2)
RETURNING id, name,code,active_channel_id,orientation,ip_address,last_active_at,created_at,updated_at;

-- name: GetDevice :one
SELECT id, name ,code,active_channel_id,orientation,ip_address,last_active_at,created_at,updated_at
FROM device 
WHERE id = $1;

-- name: GetDeviceByCode :one
SELECT id, name ,code,active_channel_id,orientation,ip_address,last_active_at,created_at,updated_at
FROM device
WHERE code = $1;

-- name: UpdateDevicesActiveChannel :exec
UPDATE device
SET active_channel_id = $1
WHERE id = ANY($2::uuid[]);


-- name: ListDevices :many
SELECT id, name, code, active_channel_id,orientation,ip_address,last_active_at,created_at,updated_at
FROM device
ORDER BY id
    LIMIT $1 OFFSET $2;

-- name: DevicesCount :one
SELECT COUNT(*) FROM device;

-- name: DeleteDevice :exec
DELETE FROM device 
WHERE id = $1;

-- name: UpdateDevice :exec
UPDATE device
SET
    name = $2,
    code = $3,
    active_channel_id = $4,
    orientation = $5,
    ip_address = $6,
    last_active_at = $7
WHERE id = $1;


-- name: GetDeviceDataByDeviceID :many
SELECT
    c.id AS channel_id,
    c.name AS channel_name,
    cs.id AS schedule_id,
    cs.start_datetime,
    cs.end_datetime,
    p.id AS playlist_id,
    p.name AS playlist_name,
    p.layout_id AS layout_id,
    l.name AS layout_name,
    l.zones AS layout_zones,
    pi.id AS item_id,
    pi."order",  -- Added field
    pi.layout_position,  -- Added field
    pi.timestring,  -- Added field
    pi.is_active,  -- Added field
    pi.content_id  -- Added field
FROM
    device d
        INNER JOIN
    channel c ON d.active_channel_id = c.id
        LEFT JOIN
    channel_schedule cs ON c.id = cs.channel_id
        LEFT JOIN
    playlist p ON cs.playlist_id = p.id
        LEFT JOIN
    layout l ON p.layout_id = l.id
        LEFT JOIN
    playlist_item pi ON p.id = pi.playlist_id
WHERE
    d.id = $1 AND d.active_channel_id IS NOT NULL;


-- name: GetDevicesDataByDevicesID :many
SELECT
    d.id AS device_id,
    c.id AS channel_id,
    c.name AS channel_name,
    cs.id AS schedule_id,
    cs.start_datetime,
    cs.end_datetime,
    p.id AS playlist_id,
    p.name AS playlist_name,
    p.layout_id AS layout_id,
    l.name AS layout_name,
    l.zones AS layout_zones,
    pi.id AS item_id,
    pi."order",  -- Added field
    pi.layout_position,  -- Added field
    pi.timestring,  -- Added field
    pi.is_active,  -- Added field
    pi.content_id  -- Added field
FROM
    device d
        INNER JOIN
    channel c ON d.active_channel_id = c.id
        LEFT JOIN
    channel_schedule cs ON c.id = cs.channel_id
        LEFT JOIN
    playlist p ON cs.playlist_id = p.id
        LEFT JOIN
    layout l ON p.layout_id = l.id
        LEFT JOIN
    playlist_item pi ON p.id = pi.playlist_id
WHERE d.id = ANY($1::uuid[]) AND d.active_channel_id IS NOT NULL;

-- name: GetDevicesByPlaylistID :many
SELECT DISTINCT d.id, d.name, d.code, d.active_channel_id, d.orientation, d.ip_address, d.last_active_at, d.created_at, d.updated_at
FROM device d
    INNER JOIN channel c ON d.active_channel_id = c.id
    INNER JOIN channel_schedule cs ON c.id = cs.channel_id
WHERE cs.playlist_id = $1 AND d.active_channel_id IS NOT NULL;

-- name: GetDevicesByChannelID :many
SELECT id, name, code, active_channel_id, orientation, ip_address, last_active_at, created_at, updated_at
FROM device
WHERE active_channel_id = $1;

-- name: GetDevicesWithActiveChannel :many
SELECT id, name, code, active_channel_id, orientation, ip_address, last_active_at, created_at, updated_at
FROM device
WHERE active_channel_id IS NOT NULL;
