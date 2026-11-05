package file

import (
	"bytes"
	"digital-signage/internal/modules/utils"
	"fmt"
	"github.com/labstack/echo/v4"
	"io"
	"net/http"
	"os"
	"time"
)

type FileController struct {
	fileService *FileService
}

func NewFileController(fileService *FileService) *FileController {
	return &FileController{
		fileService: fileService,
	}
}

func (c *FileController) RegisterRoutes(parent *echo.Group) {
	g := parent.Group("/files")

	g.POST("", c.UploadFileToTemp)
	g.GET("/*", c.ServeFile)
}

func (c *FileController) RegisterBackendRoutes(parent *echo.Group) {
	g := parent.Group("/files")

	g.POST("", c.UploadFileToTemp)
	g.GET("/*", c.ServeFile)
	g.POST("/bucket/public", c.MakeBucketPublic)
}

func (c *FileController) UploadFileToTemp(ctx echo.Context) error {
	// Get the file from the request
	file, err := ctx.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Failed to retrieve file").SetInternal(err)
	}

	src, err := file.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to open file").SetInternal(err)
	}
	defer src.Close()

	// Read file into buffer
	buffer := new(bytes.Buffer)
	_, err = io.Copy(buffer, src)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to read file").SetInternal(err)
	}

	//bucketName := c.fileService.bucketName
	objectName := fmt.Sprintf("temp/%d_%s", time.Now().Unix(), utils.Slugify(file.Filename))

	// Upload file to S3
	_, err = c.fileService.UploadToS3(buffer.Bytes(), objectName, file.Header.Get("Content-Type"))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to upload file to MinIO").SetInternal(err)
	}

	return ctx.JSON(http.StatusOK, map[string]string{
		"message":    "File uploaded successfully",
		"objectName": objectName,
	})
}

// ServeFile serves files from MinIO storage
func (c *FileController) ServeFile(ctx echo.Context) error {
	// Get file path from URL parameter (everything after /files/)
	filePath := ctx.Param("*")
	if filePath == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "File path is required")
	}

	// Get file from MinIO
	fileData, contentType, err := c.fileService.GetFile(filePath)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "File not found").SetInternal(err)
	}

	// Set appropriate content type
	if contentType != "" {
		ctx.Response().Header().Set("Content-Type", contentType)
	}

	// Set cache headers for media files
	ctx.Response().Header().Set("Cache-Control", "public, max-age=3600")

	// Serve the file
	return ctx.Stream(http.StatusOK, contentType, bytes.NewReader(fileData))
}

// MakeBucketPublic sets the bucket policy to allow public read access
func (c *FileController) MakeBucketPublic(ctx echo.Context) error {
	err := c.fileService.SetBucketPublic()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to set bucket public").SetInternal(err)
	}

	return ctx.JSON(http.StatusOK, map[string]string{
		"message": "Bucket policy updated to allow public read access",
		"bucket":  os.Getenv("AWS_BUCKET"),
	})
}
