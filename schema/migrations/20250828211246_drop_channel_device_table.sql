-- +goose Up
DROP TABLE IF EXISTS channel_device;

-- +goose Down
CREATE TABLE IF NOT EXISTS channel_device (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES device(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_channel_device_updated_at 
BEFORE UPDATE ON channel_device 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();