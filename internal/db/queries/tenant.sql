-- name: CreateTenant :one
INSERT INTO tenant (name) 
VALUES ($1)
RETURNING id, name, created_at, updated_at;

-- name: GetTenant :one
SELECT id, name, created_at, updated_at 
FROM tenant 
WHERE id = $1;

-- name: ListTenants :many
SELECT id, name, created_at, updated_at 
FROM tenant;

-- name: DeleteTenant :exec
DELETE FROM tenant 
WHERE id = $1;
