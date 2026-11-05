-- +goose Up
-- +goose StatementBegin
CREATE TABLE playlist (
                          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                          name TEXT NOT NULL,
                          layout_id uuid NOT NULL,
                          FOREIGN KEY (layout_id) REFERENCES layout(id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS playlist;
-- +goose StatementEnd
