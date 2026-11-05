package common

// PaginationResponse is the generic pagination response structure
type PaginationResponse[T any] struct {
	Data  []T   `json:"data"`  // List of items
	Count int64 `json:"count"` // Total number of items
	Limit int   `json:"limit"` // Items per page
	Offset int  `json:"offset"` // Offset for pagination
}