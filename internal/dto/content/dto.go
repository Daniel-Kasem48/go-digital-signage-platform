package dto

import (
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
	"path/filepath"
	"strings"
)



// CreateContentDto is for creating content from templates
type CreateContentDto struct {
	Name        string                 `json:"name" validate:"required"`
	Model       map[string]interface{} `json:"model" validate:"required"`
	TemplateId  pgtype.UUID           `json:"template_id" validate:"required"`
}

type CreateMediaContentDto struct {
	Name         string `json:"name" validate:"required"`
	ContentType  string `json:"content_type" validate:"required,oneof=image video"`
	TempFilePath string `json:"temp_file_path" validate:"required,filePath"`
}

// ContentResponseDto includes full URL for media content
type ContentResponseDto struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	ContentType string      `json:"content_type"`
	FilePath    *string     `json:"file_path,omitempty"`
	FullURL     *string     `json:"full_url,omitempty"`     // New field for complete MinIO URL
	Schema      interface{} `json:"schema,omitempty"`
	TemplateID  *string     `json:"template_id,omitempty"`
	CreatedAt   string      `json:"created_at"`
	UpdatedAt   string      `json:"updated_at"`
}

// Custom validation function for TempFilePath
func FilePathValidation(fl validator.FieldLevel) bool {
	parent := fl.Parent().Interface()
	
	// Handle CreateMediaContentDto
	mediaDto, ok := parent.(CreateMediaContentDto)
	if !ok {
		return true // Not a media DTO, skip validation
	}
	
	contentType := mediaDto.ContentType
	tempFilePath := mediaDto.TempFilePath

	// Define valid file extensions for each content type
	var validExtensions []string

	switch contentType {
	case "video":
		validExtensions = []string{".mp4", ".avi", ".mov"} // Add more extensions as needed
	case "image":
		validExtensions = []string{".png", ".jpg", ".jpeg", ".gif"}
	case "audio":
		validExtensions = []string{".mp3", ".wav", ".aac"}
	default:
		return true // No validation required for other content types
	}

	// Extract the file extension from the TempFilePath
	fileExtension := strings.ToLower(filepath.Ext(tempFilePath))

	// Check if the file extension is in the list of valid extensions
	for _, ext := range validExtensions {
		if fileExtension == ext {
			return true
		}
	}

	return false // Invalid file extension
}
