-- +goose Up
-- +goose StatementBegin
CREATE TABLE channel_schedule (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          start_datetime varchar(255) NOT NULL, -- Combines start_date and start_time
                          end_datetime varchar(255) NOT NULL,   -- Combines end_date and end_time
                          channel_id UUID NOT NULL,
                          playlist_id UUID NOT NULL,
                          day INTEGER NOT NULL DEFAULT 0,

                              CONSTRAINT fk_channel
                              FOREIGN KEY (channel_id) REFERENCES channel(id) ON DELETE CASCADE,
                          CONSTRAINT fk_playlist
                              FOREIGN KEY (playlist_id) REFERENCES playlist(id) ON DELETE CASCADE
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS channel_schedule;
-- +goose StatementEnd
