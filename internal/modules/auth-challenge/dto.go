package auth_challenge

// AuthChallengeDto represents the response data structure
type CreateAuthChallengeDto struct {
	Challenge string `json:"challenge"`
	Identifier string `json:"identifier"`
}