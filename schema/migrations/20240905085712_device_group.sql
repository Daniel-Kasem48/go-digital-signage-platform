-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS device_group (
                                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                            name VARCHAR(255) NOT NULL
    );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS device_group;
-- +goose StatementEnd
