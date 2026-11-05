-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS channel_device (
                                              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES device(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS channel_device;
-- +goose StatementEnd
