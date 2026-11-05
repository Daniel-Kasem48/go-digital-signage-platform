package device_display

import (
	"digital-signage/internal/config"
	"digital-signage/internal/db"
	"digital-signage/internal/handlers"
	"digital-signage/internal/middleware"
	"digital-signage/internal/modules/utils"
	"github.com/labstack/echo/v4"
	"net/http"
)

type DeviceDisplayController struct {
	datasourceService *db.DatasourceService
	deviceDisplayService *DeviceDisplayService
	validator         *handlers.CustomValidator
}

func NewDeviceDisplayController(
	datasourceService *db.DatasourceService,
	validator     *handlers.CustomValidator,
	deviceDisplayService *DeviceDisplayService,
) *DeviceDisplayController {
	return &DeviceDisplayController{
		datasourceService: datasourceService,
		validator     :    validator,
		deviceDisplayService: deviceDisplayService,
	}
}


func (c *DeviceDisplayController) RegisterRoutes(parent *echo.Group,cfg *config.Config) {
	g := parent.Group("/devices")
	g.GET("/:id/display",c.GetVideoDisplayData,middleware.ParseDeviceToken(cfg))
}

func (c *DeviceDisplayController) RegisterBackendRoutes(parent *echo.Group,cfg *config.Config) {
	g := parent.Group("/devices")
	// Tenant middleware is now applied at router level
	g.GET("/:id/display",c.GetVideoDisplayData)
}

func (c *DeviceDisplayController) GetVideoDisplayData(ctx echo.Context) error {
	ID := ctx.Param("id")

	uuId, err := utils.ParseAndConvertUUID(ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid UUID format")
	}

	data := c.deviceDisplayService.GetDevicePlaylistItems(ctx,uuId)

	return ctx.JSON(http.StatusOK, data)
}