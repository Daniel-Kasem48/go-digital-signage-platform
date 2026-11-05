package main

import (
	"context"
	_ "digital-signage/docs/swagger"
	"digital-signage/internal/config"
	db "digital-signage/internal/db"
	"digital-signage/internal/handlers"
	"digital-signage/internal/middleware"
	"digital-signage/internal/modules/auth"
	"digital-signage/internal/modules/auth-challenge"
	"digital-signage/internal/modules/channel"
	"digital-signage/internal/modules/channel-schedule"
	"digital-signage/internal/modules/content"
	"digital-signage/internal/modules/content-sync"
	device2 "digital-signage/internal/modules/device"
	device_display2 "digital-signage/internal/modules/device-display"
	device_group2 "digital-signage/internal/modules/device-group"
	device_registration2 "digital-signage/internal/modules/device-registration"
	"digital-signage/internal/modules/file"
	layout2 "digital-signage/internal/modules/layout"
	playlist2 "digital-signage/internal/modules/playlist"
	playlist_item2 "digital-signage/internal/modules/playlist-item"
	"digital-signage/internal/modules/socket"
	template2 "digital-signage/internal/modules/template"
	"digital-signage/internal/modules/tenant"
	"digital-signage/internal/modules/user"
	websocket_test "digital-signage/internal/modules/websocket-test"
	"digital-signage/internal/nats"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"

	"github.com/joho/godotenv"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"
	"go.uber.org/fx"

	"github.com/labstack/echo/v4"
)

// @title Digital Signage API
// @version 1.0
// @description Backend API for digital signage device registration, content sync, and management.
// @BasePath /
func NewEcho(cv *handlers.CustomValidator) *echo.Echo {
	e := echo.New()
	e.Pre(echoMiddleware.RemoveTrailingSlash())
	e.Use(echoMiddleware.Logger())
	e.Use(echoMiddleware.Recover())

	// Add CORS middleware for frontend testing
	e.Use(echoMiddleware.CORSWithConfig(echoMiddleware.CORSConfig{
		AllowOrigins: []string{"*"}, // Allow all origins for development
		AllowMethods: []string{echo.GET, echo.PUT, echo.POST, echo.DELETE, echo.PATCH, echo.OPTIONS},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization, "X-Tenant-ID"},
	}))

	e.Validator = cv
	return e
}

func RegisterRoutes(
	e *echo.Echo,
	fileController *file.FileController,
	deviceController *device2.DeviceController,
	deviceRegistrationController *device_registration2.DeviceRegistrationController,
	contentController *content.ContentController,
	layoutController *layout2.LayoutController,
	templateController *template2.TemplateController,
	channelController *channel.ChannelController,
	playlistItemController *playlist_item2.PlaylistItemController,
	playlistController *playlist2.PlaylistController,
	deviceGroupController *device_group2.DeviceGroupController,
	deviceDisplayController *device_display2.DeviceDisplayController,
	channelScheduleController *channel_schedule.ChannelScheduleController,
	authController *auth.AuthController,
	userController *user.UserController,
	wsTestController *websocket_test.WebSocketTestController,
	cfg *config.Config,
) {
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status": "ok",
		})
	})

	e.GET("/swagger/*", echoSwagger.WrapHandler)

	// Guest/Public routes only
	guestGroup := e.Group("/public")
	guestGroup.Use(middleware.TenantMiddleware(cfg)) // Add tenant middleware for device registration

	// Device registration routes (public for device onboarding)
	deviceController.RegisterRoutes(guestGroup)
	deviceRegistrationController.RegisterRoutes(guestGroup)
	e.GET("/live/:channelCode", channelController.ServeHostedPlayerByCode)
	e.GET("/live/:tenant/:channelRef", channelController.ServeHostedPlayer)

	// Auth routes (public for login/signup)
	apiGroup := e.Group("/api")
	authController.RegisterRoutes(apiGroup)

	// Backend API routes (tenant-scoped)
	backendGroup := e.Group("/api")
	backendGroup.Use(middleware.TenantMiddleware(cfg))

	// All protected routes moved to backend
	fileController.RegisterBackendRoutes(backendGroup)
	layoutController.RegisterBackendRoutes(backendGroup)
	templateController.RegisterBackendRoutes(backendGroup)
	playlistItemController.RegisterBackendRoutes(backendGroup)
	channelScheduleController.RegisterBackendRoutes(backendGroup)
	deviceDisplayController.RegisterBackendRoutes(backendGroup, cfg)
	deviceController.RegisterBackendRoutes(backendGroup)
	contentController.RegisterBackendRoutes(backendGroup)
	channelController.RegisterBackendRoutes(backendGroup)
	playlistController.RegisterBackendRoutes(backendGroup)
	deviceGroupController.RegisterBackendRoutes(backendGroup)
	userController.RegisterBackendRoutes(backendGroup)

	// WebSocket testing routes (for development/testing purposes)
	if cfg.EnableWebsocketTestRoutes {
		wsTestController.RegisterRoutes(backendGroup)
	}

	//TODO use content instead of contents
	contentsGroup := e.Group("/cloud/contents")
	contentsGroup.Use(middleware.TenantMiddleware(cfg)) // Apply to all cloud routes
	contentsGroup.GET("/:id/model.json", contentController.ServeModel)

	// File serving routes (public access for media files)
	filesGroup := e.Group("/cloud/files")
	filesGroup.Use(middleware.TenantMiddleware(cfg))
	fileController.RegisterRoutes(filesGroup)

	contentsGroup.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Check if the path is the one you want to exclude
			if strings.HasSuffix(c.Request().URL.Path, "model.json") {
				return next(c) // Skip the middleware
			}

			// Apply the middleware logic for other routes
			return handlers.FileServiceMiddleware(cfg)(next)(c)
		}
	})

	// Define a route within the contentsGroup to ensure it's handled
	contentsGroup.GET("/*", func(c echo.Context) error {
		// Middleware should handle the response, so just return nil here
		return nil
	})
}

// PrintRoutes prints all the registered routes in the Echo instance
func PrintRoutes(e *echo.Echo) {
	fmt.Println("Registered routes:")
	for _, route := range e.Routes() {
		fmt.Printf("Method: %s, Path: %s\n", route.Method, route.Path)
	}
}

func NewHTTPServer(lc fx.Lifecycle, e *echo.Echo, cfg *config.Config) *http.Server {
	srv := &http.Server{Addr: ":" + cfg.AppPort, Handler: e}
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
		db.DBModule, // Provides *pgxpool.Pool and binds to DBTX
		file.FileModule,
		device2.DeviceModule,
		websocket.SocketModule,
		device_registration2.Module,
		auth_challenge.AuthChallengeModule,
		layout2.LayoutModule,
		template2.TemplateModule,
		content.ContentModule,
		content_sync.ContentSyncModule,
		channel.ChannelModule,
		playlist_item2.PlaylistItemModule,
		playlist2.PlaylistModule,
		device_group2.DeviceGroupModule,
		device_display2.DeviceDisplayModule,
		channel_schedule.ChannelScheduleModule,
		nats.Module,
		tenant.TenantModule,
		user.UserModule,
		auth.AuthModule,
		websocket_test.Module,
		fx.Provide(
			config.LoadConfig,
			handlers.NewValidator,
			db.NewDatasourceServiceService,
			NewEcho,
			NewHTTPServer,
			// NewGRPCServer,
		),
		fx.Invoke(RegisterRoutes),
		fx.Invoke(func(*http.Server) {}),
		fx.Invoke(func(e *echo.Echo) {
			PrintRoutes(e)
		}),
		// fx.Invoke(func(*grpc.Server) {})
	).Run()
}
