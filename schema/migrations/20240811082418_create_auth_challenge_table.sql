-- +goose Up
-- +goose StatementBegin
CREATE TABLE auth_challenge (
                                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                                deleted_at TIMESTAMP WITH TIME ZONE,
                                identifier VARCHAR(255) NOT NULL ,
                                value VARCHAR(255) NOT NULL
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS auth_challenge;
-- +goose StatementEnd
