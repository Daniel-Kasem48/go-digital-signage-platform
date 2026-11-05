package template

import (
	"digital-signage/internal/db"
	"digital-signage/internal/handlers"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"net/http"
)

type TemplateController struct {
	templateService *TemplateService
	validator     *handlers.CustomValidator
	dbPool        *pgxpool.Pool
}

func NewTemplateController(
	templateService *TemplateService,
	validator     *handlers.CustomValidator,
	dbPool        *pgxpool.Pool,
	) *TemplateController {
	return &TemplateController{
		templateService: templateService,
		validator     :validator,
		dbPool:        dbPool,
	}
}

func (c *TemplateController) RegisterRoutes(parent *echo.Group) {
	g := parent.Group("/templates")

	g.GET("", c.List)
	g.POST("", c.Create)
}

func (c *TemplateController) RegisterBackendRoutes(parent *echo.Group) {
	g := parent.Group("/templates")

	g.GET("", c.List)
	g.POST("", c.Create)
}

func (c *TemplateController) List(ctx echo.Context) error {
	//status := ctx.QueryParam("status")
	//offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	//limit, _ := strconv.Atoi(ctx.QueryParam("limit"))

	// Get tenant-aware querier
	mtq, err := db.NewMultiTenantQuerierByContext(ctx, c.dbPool)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create tenant querier: "+err.Error())
	}

	templates, err := mtq.Querier.ListTemplates(ctx.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return ctx.JSON(http.StatusOK, templates)
}

func (c *TemplateController) Create(ctx echo.Context) error {
	input := new(TemplateInput)
	if err := ctx.Bind(input); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid input"})
	}
	if err := c.validator.ValidateAndReturnErrors(input); err != nil {
		return err
	}

	createdTemplate, err := c.templateService.Create(ctx, input)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return ctx.JSON(http.StatusOK, createdTemplate)
}