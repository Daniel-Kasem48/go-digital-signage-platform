-- name: CreateTemplate :one
INSERT INTO template (
    id,
    name,
    storage_key,
    thumbnail_storage_key,
    schema,
    created_at,
    updated_at
) VALUES (
             gen_random_uuid(),
             $1, -- name
             $2, -- storage_key
             $3, -- thumbnail_storage_key
             $4, -- schema
             NOW(), -- created_at
             NOW()  -- updated_at
         ) RETURNING *;

-- name: GetTemplateByID :one
SELECT
    id,
    name,
    storage_key,
    thumbnail_storage_key,
    schema,
    created_at,
    updated_at
FROM template
WHERE id = $1;

-- name: UpdateTemplate :exec
UPDATE template
SET
    name = $2,
    storage_key = $3,
    thumbnail_storage_key = $4,
    schema = $5,
    updated_at = NOW()
WHERE id = $1;

-- name: DeleteTemplate :exec
DELETE FROM template
WHERE id = $1;

-- name: ListTemplates :many
SELECT
    id,
    name,
    storage_key,
    thumbnail_storage_key,
    schema,
    created_at,
    updated_at
FROM template
ORDER BY created_at DESC;
