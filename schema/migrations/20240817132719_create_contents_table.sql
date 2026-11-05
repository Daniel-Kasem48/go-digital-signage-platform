-- +goose Up
-- +goose StatementBegin
CREATE TYPE content_type AS ENUM ('template', 'image', 'video');

CREATE TABLE content (
    id VARCHAR(255) PRIMARY KEY NOT NULL ,
    name VARCHAR(255) NOT NULL,
    content_type content_type NOT NULL,
    file_path VARCHAR(255) ,
    schema JSONB,
    template_id uuid ,
    FOREIGN KEY (template_id) REFERENCES template(id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS content;
DROP TYPE IF EXISTS content_type;
-- +goose StatementEnd
