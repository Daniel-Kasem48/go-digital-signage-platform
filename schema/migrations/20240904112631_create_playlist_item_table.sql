-- +goose Up
-- +goose StatementBegin
CREATE TABLE playlist_item (
                                 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                 "order" INTEGER NOT NULL DEFAULT 0,
                                 layout_position INTEGER  NOT NULL DEFAULT 0,
                                 timestring VARCHAR(255)  NOT NULL DEFAULT '8s',
                                 is_active BOOLEAN DEFAULT TRUE NOT NULL ,
                                 content_id VARCHAR(255) NOT NULL,
                                 playlist_id UUID NOT NULL,
                                 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

                                 CONSTRAINT fk_content
                                     FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
                                 CONSTRAINT fk_playlist
                                     FOREIGN KEY (playlist_id) REFERENCES playlist(id) ON DELETE CASCADE
);

-- Creating index for 'channel_content_uniqeness' for faster querying
CREATE UNIQUE INDEX playlist_item_uniq_idx ON playlist_item (playlist_id, content_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS playlist_item;
-- +goose StatementEnd


