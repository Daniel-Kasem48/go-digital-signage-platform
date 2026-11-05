-- +goose Up
-- +goose StatementBegin
    CREATE TYPE orientation AS ENUM ('landscape', 'portrait');


    CREATE TABLE device (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(255) NOT NULL UNIQUE,
        active_channel_id UUID ,
        orientation orientation DEFAULT 'landscape' NOT NULL,
    --     registered_at TIMESTAMP
        ip_address VARCHAR(255),
        last_active_at TIMESTAMP
    );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
    DROP TABLE IF EXISTS device;
    DROP TYPE IF EXISTS orientation;

-- +goose StatementEnd
