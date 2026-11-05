FROM golang:1.24.3-alpine AS builder

WORKDIR /app

# Install build dependencies only in builder stage.
RUN apk add --no-cache make git

# Download modules first to maximize cache hits.
COPY go.mod go.sum ./
RUN go mod download
RUN GOBIN=/out go install github.com/pressly/goose/v3/cmd/goose@v3.22.0

# Copy source and build the API binary.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/digital-signage ./cmd/digital-signage

FROM alpine:3.20

WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata postgresql-client

COPY --from=builder /out/digital-signage ./digital-signage
COPY --from=builder /out/goose /usr/local/bin/goose
COPY schema/migrations ./schema/migrations
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4021

ENTRYPOINT ["/entrypoint.sh"]
CMD ["./digital-signage"]
