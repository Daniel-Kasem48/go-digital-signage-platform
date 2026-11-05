include .env
DB_DRIVER=postgres

#### Variables
MIGRATION_DIR=./schema/migrations
SEED_DIR=./schema/seed

digital-signage:
	go run ./cmd/digital-signage

tenant-management:
	go run ./cmd/tenant-management

grpc:
	go run ./cmd/digital-signage/grpc

sqlc:
	./bin/sqlc generate

goose: ./bin/goose

migration:
	@echo "Running migration with args: $(COMMAND_ARGS)"
	@echo "Using migration directory: $(MIGRATION_DIR)"
	GOOSE_DRIVER=postgres GOOSE_DBSTRING="user=${DB_USER} password=${DB_PASSWORD} dbname=${DB_NAME} host=${DB_HOST} port=${DB_PORT} sslmode=disable" ./bin/goose $(COMMAND_ARGS) -dir $(MIGRATION_DIR) 

build:
	go build -o ./bin/digital-signage ./cmd/auth-service

setup:
ifeq ($(OS),Windows_NT)
	./scripts/setup.bat
else
	./scripts/setup.sh
endif

new-migration:
	@read -p "Enter migration name: " name; \
	GOOSE_DRIVER=postgres GOOSE_DBSTRING="user=${DB_USER} password=${DB_PASSWORD} dbname=${DB_NAME} host=${DB_HOST} port=${DB_PORT} sslmode=disable" ./bin/goose -dir $(MIGRATION_DIR) create $$name sql

migrate-up:
	GOOSE_DRIVER=postgres GOOSE_DBSTRING="user=${DB_USER} password=${DB_PASSWORD} dbname=${DB_NAME} host=${DB_HOST} port=${DB_PORT} sslmode=disable" ./bin/goose  -dir $(MIGRATION_DIR) up

generate-grpc:
	protoc --go_out=. --plugin=protoc-gen-go-grpc=$(HOME)/go/bin/protoc-gen-go-grpc --go-grpc_out=. cmd/digital-signage/grpc/.proto

restart-server:
	@echo "Building digital-signage server..."
	@go build -o digital-signage cmd/digital-signage/main.go
	@echo "Killing existing server processes..."
	@-pkill -f digital-signage || true
	@-lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo "Starting server..."
	@./digital-signage &
	@echo "Server restarted successfully!" 