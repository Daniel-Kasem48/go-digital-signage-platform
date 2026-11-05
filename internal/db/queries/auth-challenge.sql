-- name: ListAuthChallenges :many
SELECT * FROM auth_challenge WHERE deleted_at IS NULL ORDER BY created_at DESC;

-- name: GetAuthChallengeByIdentifier :one
SELECT * FROM auth_challenge WHERE identifier = $1 AND deleted_at IS NULL LIMIT 1;

-- name: CreateAuthChallenge :one
INSERT INTO auth_challenge (identifier, value)
VALUES ($1, $2)
    RETURNING *;

-- -- Update a challenge's value by identifier
-- UPDATE auth_challenge
-- SET value = $2, updated_at = NOW()
-- WHERE identifier = $1 AND deleted_at IS NULL
--     RETURNING *;
--
-- -- Soft delete a challenge by identifier
-- UPDATE auth_challenge
-- SET deleted_at = NOW(), updated_at = NOW()
-- WHERE identifier = $1 AND deleted_at IS NULL
--     RETURNING *;

-- name: DeleteAuthChallengeById :exec
DELETE FROM auth_challenge
WHERE id = $1;