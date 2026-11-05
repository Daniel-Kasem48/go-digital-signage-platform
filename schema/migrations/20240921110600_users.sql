-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS users (
                                     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL ,
    password TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
    );
-- +goose StatementEnd


-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS users;
-- +goose StatementEnd
