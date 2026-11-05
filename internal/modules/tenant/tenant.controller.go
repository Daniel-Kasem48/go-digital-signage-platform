package tenant

import (
	"digital-signage/internal/handlers"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"net/http"
)

type TenantController struct {
	tenantService *TenantService
	tenantManagementService *TenantManager
	dbPool *pgxpool.Pool
	validator         *handlers.CustomValidator

}

func NewTenantController(
	validator         *handlers.CustomValidator,
	tenantService *TenantService,
	dbPool *pgxpool.Pool,
	tenantManagementService *TenantManager,
	) *TenantController {
	return &TenantController{
		tenantService,
		tenantManagementService,
		dbPool,
		validator,
	}
}

func (c *TenantController) RegisterRoutes(parent *echo.Group) {
	g := parent.Group("/tenants")

	g.POST("", c.CreateTenant)
}

func (c *TenantController) CreateTenant(ctx echo.Context) error {
	input := new(CreateTenantApiParams)
	if err := ctx.Bind(input); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid input"+err.Error()})
	}

	if err := c.validator.ValidateAndReturnErrors(input); err != nil {
		return err
	}

	err := c.tenantManagementService.CreateTenantSchema(ctx.Request().Context(), input.Name)

	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return ctx.JSON(http.StatusOK, "created")
}
