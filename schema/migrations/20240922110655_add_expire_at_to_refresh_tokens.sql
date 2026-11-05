-- +goose Up
-- +goose StatementBegin
ALTER TABLE refresh_tokens ADD COLUMN expires_at TIMESTAMP NOT NULL ;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE refresh_tokens DROP COLUMN expires_at;
-- +goose StatementEnd
