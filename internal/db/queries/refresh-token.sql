-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (user_id, value,expires_at)
VALUES ($1, $2,$3)
RETURNING id, user_id, value, created_at,expires_at;

-- name: GetRefreshTokenByID :one
SELECT id, user_id, value, created_at,expires_at
FROM refresh_tokens
WHERE id = $1;

-- name: GetRefreshTokenByValue :one
SELECT id, user_id, value, created_at,expires_at
FROM refresh_tokens
WHERE value = $1;


-- name: GetRefreshTokenWithUser :one
SELECT sqlc.embed(refresh_tokens), sqlc.embed(users)
FROM refresh_tokens
JOIN users ON users.id = refresh_tokens.user_id
WHERE refresh_tokens.value = $1;


-- name: GetRefreshTokensByUserID :many
SELECT id, user_id, value, created_at,expires_at
FROM refresh_tokens
WHERE user_id = $1;

-- name: DeleteRefreshToken :exec
DELETE FROM refresh_tokens
WHERE id = $1;

-- name: DeleteRefreshTokenByValue :exec
DELETE FROM refresh_tokens
WHERE value = $1;

-- name: DeleteRefreshTokensByUserID :exec
DELETE FROM refresh_tokens
WHERE user_id = $1;
