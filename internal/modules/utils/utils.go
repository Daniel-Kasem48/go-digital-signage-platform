package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"math/big"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt"
)
const S3DirTemplates = "templates"

func GenerateRandomCharacters(length int) string {
	const characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*"
	var password strings.Builder
	characterCount := big.NewInt(int64(len(characters)))

	for i := 0; i < length; i++ {
		index, err := rand.Int(rand.Reader, characterCount)
		if err != nil {
			// handle error
			return ""
		}
		password.WriteByte(characters[index.Int64()])
	}

	return password.String()
}

// deriveKey generates a key based on the current UTC date and a known part.
func deriveKey(knownPart string) string {
	now := time.Now().UTC()
	keyMaterial := fmt.Sprintf("%d-%d-%d", now.Year(), now.Month(), now.Day())
	return keyMaterial + knownPart
}

func IsValidHash(data, receivedHash, knownKeyPart string) bool {
	secretKey := deriveKey(knownKeyPart)
	digest := sha256.Sum256([]byte(data + secretKey))
	return hex.EncodeToString(digest[:]) == receivedHash
}

// GenerateDeviceToken generates a JWT token for the device using deviceCode and deviceID.
func GenerateDeviceToken(jWTSecret string, deviceCode string, deviceID pgtype.UUID) (string, error) {
	// Set the JWT claims, which include the deviceCode and deviceID
	claims := &jwt.MapClaims{
		"deviceCode": deviceCode,
		"deviceID":   deviceID,
		"exp":        time.Now().Add(24 * time.Hour).Unix(), // Token expiration time (1 day from now)
		"iat":        time.Now().Unix(),                     // Issued at time
	}

	// CreateFromTemplate the token using the claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	accessToken, err := token.SignedString([]byte(jWTSecret))

	if err != nil {
		return "", err
	}

	return accessToken, nil
}



// Slugify converts a filename into a slug format while preserving the file extension
func Slugify(filename string) string {
	// Separate the base name (without extension) and extension
	ext := filepath.Ext(filename) // Get the file extension, e.g., ".png"
	base := strings.TrimSuffix(filename, ext) // Get the base name, e.g., "Room Control"

	// Convert the base name to lowercase and replace non-alphanumeric characters with a hyphen
	re := regexp.MustCompile("[^a-z0-9]+")
	baseSlug := re.ReplaceAllString(strings.ToLower(base), "-")

	// Trim leading and trailing hyphens
	baseSlug = strings.Trim(baseSlug, "-")

	// Return the slugified base with the original extension
	return baseSlug + ext
}

func GenerateS3TemplateIdentifier(templateId string) string {
	return fmt.Sprintf("%s/%s/template.zip", S3DirTemplates, templateId)
}

func ParseAndConvertUUID(ID string) (pgtype.UUID, error) {
	// Parse the ID string to uuid.UUID
	parsedUUID, err := uuid.Parse(ID)
	if err != nil {
		return pgtype.UUID{}, err
	}

	// Convert the uuid.UUID to pgtype.UUID
	uuid := pgtype.UUID{
		Bytes: [16]byte(parsedUUID[:]),
		Valid: true,
	}

	return uuid, nil
}

// Helper function to convert the byte slice of pgtype.UUID to a UUID string
func UuidBytesToString(b [16]byte) string {
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4],   // First 4 bytes
		b[4:6],   // Next 2 bytes
		b[6:8],   // Next 2 bytes
		b[8:10],  // Next 2 bytes
		b[10:16], // Last 6 bytes
	)
}