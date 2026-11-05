package config

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	AppPort        string
	AppEnv         string
	DBUser         string
	DBPassword     string
	DBName         string
	DBPort         string
	DBHost         string
	JWTSecret      string
	AWSRegion      string
	AWSEndpoint    string
	CDNPrefix      string
	AWSAccessKeyId string
	AWSBucket      string
	AWSSecretKey   string

	AuthChallengeSecret string
	DeviceSecret        string

	EnableWebsocketTestRoutes bool
}

func LoadConfig() *Config {
	dbHost := normalizeHost(os.Getenv("DB_HOST"))

	config := Config{
		AppPort:    getenvOrDefault("APP_PORT", "8080"),
		AppEnv:     getenvOrDefault("APP_ENV", "development"),
		DBUser:     os.Getenv("DB_USER"),
		DBPassword: os.Getenv("DB_PASSWORD"),
		DBName:     os.Getenv("DB_NAME"),
		JWTSecret:  os.Getenv("JWT_SECRET"),
		DBHost:     dbHost,
		DBPort:     os.Getenv("DB_PORT"),

		AWSRegion:           os.Getenv("AWS_REGION"),
		AWSBucket:           os.Getenv("AWS_BUCKET"),
		AWSEndpoint:         os.Getenv("AWS_ENDPOINT"),
		CDNPrefix:           getenvFirst("CDN_PREFIX", "AWS_CDN_PREFIX"),
		AWSAccessKeyId:      os.Getenv("AWS_KEY_ID"),
		AWSSecretKey:        os.Getenv("AWS_SECRET_KEY"),
		AuthChallengeSecret: os.Getenv("AUTH_CHALLENGE_SECRET"),
		DeviceSecret:        os.Getenv("DEVICE_SECRET"),

		EnableWebsocketTestRoutes: strings.EqualFold(os.Getenv("ENABLE_WEBSOCKET_TEST_ROUTES"), "true"),
	}

	// Debug logging
	fmt.Printf("Loaded Config: %+v\n", config)

	return &config
}

func getenvOrDefault(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getenvFirst(keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}
	return ""
}

func normalizeHost(host string) string {
	host = strings.TrimSpace(host)
	if host == "" {
		return host
	}

	if parsedHost, _, err := net.SplitHostPort(host); err == nil {
		return parsedHost
	}

	if strings.Count(host, ":") == 1 {
		if hostPart, portPart, ok := strings.Cut(host, ":"); ok && hostPart != "" {
			if _, err := strconv.Atoi(portPart); err == nil {
				return hostPart
			}
		}
	}

	return host
}
