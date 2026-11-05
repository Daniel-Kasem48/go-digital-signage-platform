package common

import (
	"github.com/labstack/echo/v4"
	"strconv"
)

// FetchPaginatedResponse wraps the provided data into a PaginationResponse
func FetchPaginatedResponse[T any]( data []T, totalCount int64, limit, offset int) (PaginationResponse[T], error) {
	// Wrap the provided data into a pagination response
	return PaginationResponse[T]{
		Data:   data,
		Count:  totalCount,
		Limit:  limit,
		Offset: offset,
	}, nil
}

// HandleLimitAndOffsetFromCtx extracts limit and offset from the context, with default values
func HandleLimitAndOffsetFromCtx(ctx echo.Context) (int, int) {
	// Default values
	defaultOffset := 0
	defaultLimit := 25

	// Parse offset from query, default to 0 if not present or invalid
	offset, err := strconv.Atoi(ctx.QueryParam("offset"))
	if err != nil || offset < 0 {
		offset = defaultOffset
	}

	// Parse limit from query, default to 25 if not present or invalid
	limit, err := strconv.Atoi(ctx.QueryParam("limit"))
	if err != nil || limit <= 0 {
		limit = defaultLimit
	}

	return offset, limit
}