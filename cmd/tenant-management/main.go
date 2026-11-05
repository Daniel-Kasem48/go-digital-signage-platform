package main

import (
	"context"
	"digital-signage/internal/config"
	db "digital-signage/internal/db"
	"digital-signage/internal/handlers"
	"digital-signage/internal/modules/tenant"
	"fmt"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4/middleware"
	"go.uber.org/fx"
	"log"
	"net"
	"net/http"

	"github.com/labstack/echo/v4"
)

func NewEcho(cv *handlers.CustomValidator) *echo.Echo {
	e := echo.New()
	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Validator = cv
	return e
}

func RegisterRoutes(
	e *echo.Echo,
	tenantController *tenant.TenantController,
) {
	rootGroup := e.Group("/api")
	tenantController.RegisterRoutes(rootGroup)
}

// PrintRoutes prints all the registered routes in the Echo instance
func PrintRoutes(e *echo.Echo) {
	fmt.Println("Registered routes:")
	for _, route := range e.Routes() {
		fmt.Printf("Method: %s, Path: %s\n", route.Method, route.Path)
	}
}

func NewHTTPServer(lc fx.Lifecycle, e *echo.Echo) *http.Server {
	srv := &http.Server{Addr: ":8080", Handler: e}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			ln, err := net.Listen("tcp", srv.Addr)
			if err != nil {
				return err
			}
			fmt.Println("Starting HTTP server at", srv.Addr)
			go srv.Serve(ln)
			return nil
		},
		OnStop: func(ctx context.Context) error {
			return srv.Shutdown(ctx)
		},
	})
	return srv
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}
	config.LoadConfig()

	fx.New(
		db.DBModule,         // Provides *pgxpool.Pool and binds to DBTX
		tenant.TenantModule,
		fx.Provide(
			config.LoadConfig,
			handlers.NewValidator,
			db.NewDatasourceServiceService,
			NewEcho,
			NewHTTPServer,
		),
		fx.Invoke(RegisterRoutes),
		fx.Invoke(func(*http.Server) {}),
		fx.Invoke(func(e *echo.Echo) {
			PrintRoutes(e)
		}),
	).Run()
}