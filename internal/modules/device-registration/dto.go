package device_registration

// RequestDeviceChallengeInput represents the input data structure for the mutation
type RequestDeviceChallengeInput struct {
	Identifier string `json:"identifier" validate:"required"`
}

// AssignDeviceInput represents the input data structure for the mutation
type AssignDeviceInput struct {
	Code string `json:"code" validate:"required"`
}

// DeviceInput represents input data for creating or updating a device.
type DeviceInput struct {
	Identifier    string  `json:"identifier" validate:"required"`
	ChallengeHash string  `json:"challengeHash" validate:"required"`
	Version       *string `json:"version,omitempty"` // Nullable field
	IPAddress     string  `json:"ipAddress"`
}

// SimpleDeviceInput is an Appspace-like one-step registration payload.
type SimpleDeviceInput struct {
	Identifier string  `json:"identifier,omitempty"`
	Name       string  `json:"name,omitempty"`
	Version    *string `json:"version,omitempty"`
	IPAddress  string  `json:"ipAddress,omitempty"`
}

// JWTRequest represents the payload the client sends to request a JWT
type JWTRequest struct {
	ClientID string `json:"client_id"` // Client identifier, e.g., public NKey or device ID
}

// JWTResponse represents the response that includes the JWT
type JWTResponse struct {
	Token string `json:"token"`
}
