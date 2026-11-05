-- +goose Up
-- +goose StatementBegin
CREATE TABLE template (
                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                           name VARCHAR(255) NOT NULL,
                           storage_key VARCHAR,
                           thumbnail_storage_key VARCHAR,
                           schema JSONB,
                           created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                           updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                           deleted_at TIMESTAMPTZ
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS template;
-- +goose StatementEnd
