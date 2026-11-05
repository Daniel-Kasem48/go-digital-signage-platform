package nats

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/nats-io/nats.go"
	"log"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// UpdateMessage defines the structure of the update message
type UpdateMessage struct {
	Action string                 `json:"action"`
	Data   map[string]interface{} `json:"message"` // Dynamic field
}

// NATSService holds the NATS connection and provides methods to interact with it
type NATSService struct {
	conn *nats.Conn
	//natsKV             *nats.KeyValue // NATS Key-Value store for rooms
	js nats.JetStreamContext
}

//func (s *NATSService) GetNatsKV() nats.KeyValue  {
//	return *s.natsKV
//}

// NewNATSService initializes and returns a new NATSService
func NewNATSService() (*NATSService, error) {
	natsURLs := buildNATSURLs()
	natsTimeout := natsConnectTimeout()
	natsDialer := &net.Dialer{Timeout: natsTimeout}
	connectErrors := make([]string, 0, len(natsURLs))

	for _, serverURL := range natsURLs {
		nc, err := nats.Connect(serverURL, nats.Timeout(natsTimeout), nats.Dialer(natsDialer))
		if err != nil {
			connectErrors = append(connectErrors, fmt.Sprintf("%s: %v", serverURL, err))
			continue
		}

		js, err := nc.JetStream()
		if err != nil {
			nc.Close()
			connectErrors = append(connectErrors, fmt.Sprintf("%s: jetstream init failed: %v", serverURL, err))
			continue
		}

		return &NATSService{
			conn: nc,
			js:   js,
		}, nil
	}

	allServers := strings.Join(natsURLs, ",")
	connectErr := fmt.Errorf("failed to connect to NATS server(s): %s", strings.Join(connectErrors, " | "))
	if !isNATSRequired() {
		log.Printf("NATS unavailable, continuing without realtime cross-instance sync (servers=%s): %v", allServers, connectErr)
		return nil, nil
	}

	return nil, connectErr
}

func buildNATSURLs() []string {
	natsURL := strings.TrimSpace(os.Getenv("NATS_URL"))
	if natsURL != "" {
		return expandNATSURLList(natsURL)
	}

	host, port, scheme := normalizeNATSHost(getenvOrDefault("NATS_HOST", "localhost"), getenvOrDefault("NATS_PORT", "4222"))
	return expandNATSURLList(fmt.Sprintf("%s://%s:%s", scheme, host, port))
}

func expandNATSURLList(urlList string) []string {
	rawURLs := strings.Split(urlList, ",")
	out := make([]string, 0, len(rawURLs))
	seen := make(map[string]struct{})
	defaultPort := getenvOrDefault("NATS_PORT", "4222")

	for _, raw := range rawURLs {
		normalized, err := normalizeNATSURL(raw, defaultPort)
		if err != nil {
			continue
		}

		expanded := expandWithDNS(normalized)
		for _, serverURL := range expanded {
			if _, exists := seen[serverURL]; exists {
				continue
			}
			seen[serverURL] = struct{}{}
			out = append(out, serverURL)
		}
	}

	if len(out) == 0 {
		out = append(out, fmt.Sprintf("nats://localhost:%s", defaultPort))
	}

	return out
}

func normalizeNATSURL(rawURL string, defaultPort string) (string, error) {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return "", fmt.Errorf("empty nats url")
	}

	if !strings.Contains(trimmed, "://") {
		trimmed = "nats://" + trimmed
	}

	parsed, err := url.Parse(trimmed)
	if err != nil {
		return "", err
	}

	scheme := strings.ToLower(parsed.Scheme)
	switch scheme {
	case "http":
		scheme = "nats"
	case "https":
		scheme = "tls"
	}

	host := parsed.Hostname()
	if host == "" {
		return "", fmt.Errorf("missing host in nats url")
	}

	port := parsed.Port()
	if port == "" {
		port = defaultPort
	}

	return fmt.Sprintf("%s://%s:%s", scheme, host, port), nil
}

func normalizeNATSHost(rawHost string, defaultPort string) (host string, port string, scheme string) {
	host = strings.TrimSpace(rawHost)
	port = strings.TrimSpace(defaultPort)
	if port == "" {
		port = "4222"
	}
	scheme = "nats"

	if host == "" {
		return "localhost", port, scheme
	}

	if strings.Contains(host, "://") {
		parsed, err := url.Parse(host)
		if err == nil && parsed.Hostname() != "" {
			host = parsed.Hostname()
			if parsed.Port() != "" {
				port = parsed.Port()
			}
			switch strings.ToLower(parsed.Scheme) {
			case "https":
				scheme = "tls"
			case "http":
				scheme = "nats"
			case "tls":
				scheme = "tls"
			}
		}
	}

	if splitHost, splitPort, err := net.SplitHostPort(host); err == nil {
		if splitHost != "" {
			host = splitHost
		}
		if splitPort != "" {
			port = splitPort
		}
		return host, port, scheme
	}

	if strings.Count(host, ":") == 1 {
		if splitHost, splitPort, ok := strings.Cut(host, ":"); ok && splitHost != "" {
			if _, err := strconv.Atoi(splitPort); err == nil {
				host = splitHost
				port = splitPort
			}
		}
	}

	return host, port, scheme
}

func expandWithDNS(serverURL string) []string {
	parsed, err := url.Parse(serverURL)
	if err != nil {
		return []string{serverURL}
	}

	host := parsed.Hostname()
	port := parsed.Port()
	if host == "" || port == "" {
		return []string{serverURL}
	}

	if net.ParseIP(host) != nil {
		return []string{serverURL}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil || len(ips) == 0 {
		return []string{serverURL}
	}

	expanded := make([]string, 0, len(ips)+1)
	expanded = append(expanded, serverURL)
	for _, ip := range ips {
		expanded = append(expanded, fmt.Sprintf("%s://%s:%s", parsed.Scheme, ip.IP.String(), port))
	}

	return expanded
}

func isNATSRequired() bool {
	raw := strings.TrimSpace(os.Getenv("NATS_REQUIRED"))
	if raw == "" {
		return false
	}

	required, err := strconv.ParseBool(raw)
	if err != nil {
		return false
	}

	return required
}

func natsConnectTimeout() time.Duration {
	raw := strings.TrimSpace(os.Getenv("NATS_CONNECT_TIMEOUT"))
	if raw == "" {
		return 2 * time.Second
	}

	if duration, err := time.ParseDuration(raw); err == nil {
		return duration
	}

	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds <= 0 {
		return 2 * time.Second
	}

	return time.Duration(seconds) * time.Second
}

func getenvOrDefault(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func (s *NATSService) getOrCreateBucket(bucketName string) (nats.KeyValue, error) {
	kv, err := s.js.KeyValue(bucketName)
	if err == nil {
		return kv, nil
	}
	if !errors.Is(err, nats.ErrBucketNotFound) && !errors.Is(err, nats.ErrBadBucket) {
		return nil, fmt.Errorf("failed to access %s bucket: %w", bucketName, err)
	}

	kv, err = s.js.CreateKeyValue(&nats.KeyValueConfig{
		Bucket: bucketName,
	})
	if err != nil {
		// Another instance may have created the bucket concurrently.
		kv, getErr := s.js.KeyValue(bucketName)
		if getErr == nil {
			return kv, nil
		}
		return nil, fmt.Errorf("failed to create %s bucket: %w", bucketName, err)
	}

	return kv, nil
}

func (s *NATSService) GetRoomBucket() (nats.KeyValue, error) {
	return s.getOrCreateBucket("ROOMS")
}

func (s *NATSService) GetDeviceLastActiveBucket() (nats.KeyValue, error) {
	return s.getOrCreateBucket("DEVICE_LAST_ACTIVITY")
}

func (s *NATSService) Publish(subject string, data []byte) error {
	return s.conn.Publish(subject, data)
}

func (s *NATSService) Subscribe(subject string, handler nats.MsgHandler) (*nats.Subscription, error) {
	return s.conn.Subscribe(subject, handler)
}

// PublishUpdate sends a content update to a specified NATS subject
func (s *NATSService) PublishUpdate(subject string, update UpdateMessage) error {
	// Convert the update message to JSON
	updateBytes, err := json.Marshal(update)
	if err != nil {
		return fmt.Errorf("failed to marshal update message: %w", err)
	}

	// Publish the message to the specified subject
	err = s.Publish(subject, updateBytes)
	if err != nil {
		return fmt.Errorf("failed to publish update message: %w", err)
	}

	return nil
}

// Close closes the connection to NATS
func (s *NATSService) Close() {
	s.conn.Close()
	log.Println("NATS connection closed")
}
