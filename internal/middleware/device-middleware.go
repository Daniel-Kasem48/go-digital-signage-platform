package middleware

import (
	"digital-signage/internal/config"
	"github.com/dgrijalva/jwt-go"
	"github.com/labstack/echo/v4"
	"net/http"
	"strings"
)

// DeviceJWTMiddleware validates the JWT token in the request headers and extracts the deviceCode and deviceID.
//func DeviceJWTMiddleware(cfg *config.Config) echo.MiddlewareFunc {
//	return middleware.JWTWithConfig(middleware.JWTConfig{
//		SigningKey:    []byte(cfg.DeviceSecret),
//		TokenLookup:   "header:Authorization",  // Where to look for the JWT token
//		AuthScheme:    "Bearer",                // The JWT token scheme
//		SigningMethod: "HS256",
//		ContextKey:    "user",                  // Key in the context to store the parsed token
//	})
//}

// ParseDeviceToken is a function to extract deviceCode and deviceID from the token
func ParseDeviceToken(cfg *config.Config) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Get the Authorization header
			authHeader := c.Request().Header.Get("x-device-authorization")
			if authHeader == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "Missing Authorization header")
			}

			// Extract the token from "Bearer <token>"
			tokenString := strings.Split(authHeader, " ")[1]

			// Parse the token
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				// Validate the signing method
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, echo.NewHTTPError(http.StatusUnauthorized, "Invalid token signing method")
				}
				return []byte(cfg.DeviceSecret), nil
			})

			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "Invalid token")
			}

			// Extract claims if token is valid
			if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {

				deviceCode := claims["deviceCode"].(string)
				deviceID := claims["deviceID"].(string)

				// Add claims to context (you can use this later in your handlers)
				c.Set("deviceCode", deviceCode)
				c.Set("deviceID", deviceID)
			} else {
				return echo.NewHTTPError(http.StatusUnauthorized, "Invalid token claims")
			}

			// Proceed to the next handler
			return next(c)
		}
	}
}