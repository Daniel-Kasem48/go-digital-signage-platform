-- name: ListContents :many
SELECT * FROM content
ORDER BY id
    LIMIT $1 OFFSET $2;

-- name: GetContentById :one
SELECT * FROM content WHERE id = $1 LIMIT 1;

-- name: CreateContent :one
INSERT INTO content (id,name, content_type, schema,template_id,file_path)
VALUES ($1, $2, $3,$4,$5,$6)
    RETURNING *;

-- name: UpdateContentById :one
UPDATE content
SET name = $2,
    content_type = $3,
    schema = $4
WHERE id = $1
    RETURNING *;

-- name: DeleteContentById :exec
DELETE FROM content
WHERE id = $1;

-- name: ListContentsByType :many
SELECT * FROM content
WHERE content_type = $1;

-- name: ContentsCount :one
SELECT COUNT(*) FROM content;