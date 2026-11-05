-- +goose Up
-- +goose StatementBegin
DROP INDEX IF EXISTS playlist_item_uniq_idx;

CREATE INDEX IF NOT EXISTS playlist_item_playlist_id_idx ON playlist_item (playlist_id);
CREATE INDEX IF NOT EXISTS playlist_item_content_id_idx ON playlist_item (content_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS playlist_item_playlist_id_idx;
DROP INDEX IF EXISTS playlist_item_content_id_idx;

CREATE UNIQUE INDEX IF NOT EXISTS playlist_item_uniq_idx ON playlist_item (playlist_id, content_id);
-- +goose StatementEnd
