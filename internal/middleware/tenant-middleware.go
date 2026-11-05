package middleware

import (
	"context"
	"digital-signage/internal/config"
	"fmt"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

func TenantMiddleware(cfg *config.Config) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			fmt.Printf("[TENANT MIDDLEWARE] Processing request: %s %s\n", c.Request().Method, c.Request().URL.Path)

			tenantSlug, err := ExtractTenant(c, cfg)
			if err != nil {
				return echo.NewHTTPError(http.StatusBadRequest, err.Error())
			}

			ctx := context.WithValue(c.Request().Context(), "tenantSlug", tenantSlug)
			c.SetRequest(c.Request().WithContext(ctx))

			fmt.Printf("[TENANT MIDDLEWARE] Set tenant slug in context: %s\n", tenantSlug)

			return next(c)
		}
	}
}


func ExtractTenant(c echo.Context, cfg *config.Config) (string, error) {
	// First, try to get tenant from header
	tenantHeader := c.Request().Header.Get("X-Tenant-ID")
	if tenantHeader != "" {
		fmt.Printf("[TENANT MIDDLEWARE] Found tenant in header: %s\n", tenantHeader)
		return tenantHeader, nil
	}

	// If no header, try to extract from subdomain
	host := c.Request().Host
	
	// Remove port if present
	if idx := strings.Index(host, ":"); idx != -1 {
		host = host[:idx]
	}
	
	// Split the host by "."
	parts := strings.Split(host, ".")
	
	// Check if it's a subdomain pattern (at least 3 parts: subdomain.domain.tld)
	if len(parts) >= 3 && parts[0] != "www" {
		tenant := parts[0]
		fmt.Printf("[TENANT MIDDLEWARE] Found tenant in subdomain: %s\n", tenant)
		return tenant, nil
	}
	
	return "", fmt.Errorf("no tenant identifier found in header or subdomain")
}
