@echo off

set GOBIN=%cd%\bin

go install github.com/swaggo/swag/cmd/swag@latest
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
go install github.com/pressly/goose/v3/cmd/goose@latest
go install github.com/dgrijalva/jwt-go
go install github.com/lib/pq
go get github.com/labstack/echo
go get github.com/labstack/echo/v4/middleware
go install github.com/jackc/pgx/v5/pgtype
