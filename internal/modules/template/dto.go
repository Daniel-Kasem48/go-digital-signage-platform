package template


type TemplateInput struct {
	Name           string `json:"name" validate:"required,min=1,max=255"`
	StorageKey     string `json:"storageKey" validate:"required"`
	ThumbnailStorageKey string
}

