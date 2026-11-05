package auth

import (
	"github.com/dgrijalva/jwt-go"
	"github.com/jackc/pgx/v5/pgtype"
)

type ApiCreateUserParams struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type ApiLoginParams struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type ApiLogoutParams struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type JWTCustomClaims struct {
	ID       pgtype.UUID `json:"id"`
	Username string      `json:"username"`
	jwt.StandardClaims
}

type ApiRefreshTokenParams struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}
