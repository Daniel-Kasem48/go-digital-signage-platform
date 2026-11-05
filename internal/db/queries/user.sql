-- name: CreateUser :exec
INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *;

-- name: GetUserByUsername :one
SELECT id, username, password, created_at, updated_at FROM users WHERE username = $1;


-- name: GetUser :one
SELECT *
FROM users
WHERE id = $1;

-- name: ListUsers :many
SELECT *
FROM users;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;
