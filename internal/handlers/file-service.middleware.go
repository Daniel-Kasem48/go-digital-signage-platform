package handlers

import (
	"bytes"
	"context"
	"digital-signage/internal/config"
	"digital-signage/internal/modules/file"
	"fmt"
	"github.com/labstack/echo/v4"
	"io"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func FileServiceMiddleware(cfg *config.Config) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {

			// Extract content ID from the request URL
			path := c.Param("*")
			templateContentId := strings.Split(path, "/")[0]
			templateId := strings.Split(templateContentId, "_")[0]

			// Prepare the S3 client
			s3Client, err := file.NewS3Client(cfg)
			if err != nil {
				return c.String(http.StatusInternalServerError, err.Error())
			}

			// Prepare the S3 key based on the request
			s3Key := fmt.Sprintf("contents/%s", path)
			needsIndexHtml := false

			if strings.HasSuffix(s3Key, "/preview") {
				s3Key = strings.Replace(s3Key, "/preview", "/index.html", 1)
			} else if strings.HasSuffix(s3Key, fmt.Sprintf("contents/%s", templateContentId)) {
				needsIndexHtml = true
			}

			//TODO testing purposes,remove it
			////////////////////
			s3Key = strings.ReplaceAll(s3Key, templateContentId, templateId)
			s3Key = strings.ReplaceAll(s3Key, "contents", "templates")

			// Add index.html after transformations if needed
			if needsIndexHtml {
				s3Key += "/index.html"
			}

			fmt.Println("DEBUG: Bucket:", cfg.AWSBucket, "S3Key:", s3Key)
			////////////////////

			// Get the object from S3
			getObjectInput := &s3.GetObjectInput{
				Bucket: &cfg.AWSBucket,
				Key:    &s3Key,
			}
			resp, err := s3Client.GetObject(context.TODO(), getObjectInput)
			if err != nil {
				return c.String(http.StatusInternalServerError, err.Error())
			}
			defer resp.Body.Close()

			// Set headers for the response
			c.Response().Header().Set("Cache-Control", "public, max-age=31536000")
			c.Response().Header().Set("Last-Modified", resp.LastModified.Format(http.TimeFormat))

			// Ensure Content-Type is set correctly
			contentType := aws.ToString(resp.ContentType)
			if strings.HasSuffix(s3Key, ".js") {
				contentType = "application/javascript"
			}
			c.Response().Header().Set("Content-Type", contentType)

			// Stream the S3 object to the HTTP response and ensure Content-Length is correct
			writer := c.Response().Writer
			buffer := new(bytes.Buffer)

			// Copy the response body to the buffer
			contentLength, err := io.Copy(buffer, resp.Body)
			if err != nil {
				return c.String(http.StatusInternalServerError, err.Error())
			}

			// Set the correct Content-Length header
			c.Response().Header().Set("Content-Length", fmt.Sprintf("%d", contentLength))

			// Write the buffer to the response writer
			if _, err := io.Copy(writer, buffer); err != nil {
				return c.String(http.StatusInternalServerError, err.Error())
			}

			return nil
		}
	}
}
