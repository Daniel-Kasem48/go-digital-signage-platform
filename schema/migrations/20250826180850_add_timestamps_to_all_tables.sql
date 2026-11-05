-- +goose Up
-- +goose StatementBegin

-- Add created_at and updated_at to tenant table
ALTER TABLE tenant 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Add created_at and updated_at to device table
ALTER TABLE device 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Add created_at and updated_at to content table
ALTER TABLE content 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Add created_at and updated_at to playlist table
ALTER TABLE playlist 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Add created_at and updated_at to device_group table
ALTER TABLE device_group 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Add created_at and updated_at to channel_schedule table
ALTER TABLE channel_schedule 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Add updated_at to users table (already has created_at)
ALTER TABLE users 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Add updated_at to refresh_tokens table (already has created_at)
ALTER TABLE refresh_tokens 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables to automatically update updated_at
CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON tenant FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_updated_at BEFORE UPDATE ON device FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playlist_updated_at BEFORE UPDATE ON playlist FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_group_updated_at BEFORE UPDATE ON device_group FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channel_schedule_updated_at BEFORE UPDATE ON channel_schedule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refresh_tokens_updated_at BEFORE UPDATE ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Also create triggers for tables that already have updated_at columns
CREATE TRIGGER update_auth_challenge_updated_at BEFORE UPDATE ON auth_challenge FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_layout_updated_at BEFORE UPDATE ON layout FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_updated_at BEFORE UPDATE ON template FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channel_updated_at BEFORE UPDATE ON channel FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channel_device_updated_at BEFORE UPDATE ON channel_device FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playlist_item_updated_at BEFORE UPDATE ON playlist_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop triggers
DROP TRIGGER IF EXISTS update_tenant_updated_at ON tenant;
DROP TRIGGER IF EXISTS update_device_updated_at ON device;
DROP TRIGGER IF EXISTS update_content_updated_at ON content;
DROP TRIGGER IF EXISTS update_playlist_updated_at ON playlist;
DROP TRIGGER IF EXISTS update_device_group_updated_at ON device_group;
DROP TRIGGER IF EXISTS update_channel_schedule_updated_at ON channel_schedule;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_refresh_tokens_updated_at ON refresh_tokens;
DROP TRIGGER IF EXISTS update_auth_challenge_updated_at ON auth_challenge;
DROP TRIGGER IF EXISTS update_layout_updated_at ON layout;
DROP TRIGGER IF EXISTS update_template_updated_at ON template;
DROP TRIGGER IF EXISTS update_channel_updated_at ON channel;
DROP TRIGGER IF EXISTS update_channel_device_updated_at ON channel_device;
DROP TRIGGER IF EXISTS update_playlist_item_updated_at ON playlist_item;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remove columns
ALTER TABLE tenant DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;
ALTER TABLE device DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;
ALTER TABLE content DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;
ALTER TABLE playlist DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;
ALTER TABLE device_group DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;
ALTER TABLE channel_schedule DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS updated_at;

-- +goose StatementEnd