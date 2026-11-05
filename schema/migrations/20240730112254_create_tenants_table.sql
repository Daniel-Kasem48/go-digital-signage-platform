-- +goose Up
-- +goose StatementBegin
CREATE TABLE tenant (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS tenant;
-- +goose StatementEnd
