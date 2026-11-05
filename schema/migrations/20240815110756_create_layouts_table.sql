-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS layout (
                                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                      name VARCHAR(255) NOT NULL,
    zones JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS layout;
-- +goose StatementEnd
