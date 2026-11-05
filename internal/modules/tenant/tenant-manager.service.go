package tenant

import (
	"database/sql"
	"digital-signage/internal/config"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/lib/pq" // Import pq driver for SQL
	"github.com/pressly/goose/v3"
	"golang.org/x/net/context"
	"strings"
)

type TenantManager struct {
	dbPool *pgxpool.Pool
	cfg    *config.Config
}

func NewTenantManager(dbPool *pgxpool.Pool,cfg *config.Config) *TenantManager {
	return &TenantManager{dbPool: dbPool,cfg: cfg}
}


func (tm *TenantManager) CreateTenantSchema(ctx context.Context, tenantName string) error {
	// Slugify the tenant name
	schema := slugify(tenantName)

	// Start a transaction
	tx, err := tm.dbPool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)


	// Create the schema
	if _, err := tx.Exec(ctx, fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", schema)); err != nil {
		return fmt.Errorf("failed to create schema: %w", err)
	}

	// Commit the transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Run migrations for the new schema

	cfg:=tm.cfg
	connString := fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=disable",
		cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBHost, cfg.DBPort)

	sqlDb, _ :=createSQLDB(connString)
	fmt.Println("sqlDb",sqlDb)
	err = MigrateTenantSchemas(sqlDb,schema,"schema/migrations")

	if err != nil {
		return err
	}


	return nil
}


func createSQLDB(connString string) (*sql.DB, error) {
	// Debug: Print connection string
	fmt.Println("Connection String:", connString)

	// Use pq driver with "postgres"
	db, err := sql.Open("postgres", connString)
	if err != nil {
		fmt.Println("Failed to create *sql.DB:", err)
		return nil, fmt.Errorf("failed to create *sql.DB: %w", err)
	}

	// Check if the database connection works
	err = db.Ping()
	if err != nil {
		fmt.Println("Failed to ping database:", err)
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	fmt.Println("Successfully connected to the database")
	return db, nil
}

func MigrateTenantSchemas(db *sql.DB,tenantSchemaName string, migrationsDir string) error {
	ctx := context.Background()

		// Set the search_path to the tenant schema
		_, err := db.ExecContext(ctx, fmt.Sprintf("SET search_path TO %s", tenantSchemaName))

		if err != nil {
			return err
		}

		// Run Goose migrations for this schema
		if err := goose.Up(db, migrationsDir); err != nil {
			return fmt.Errorf("failed to migrate schema %s: %w", tenantSchemaName, err)
		}

	return nil
}

func slugify(s string) string {
	// Convert to lowercase
	s = strings.ToLower(s)
	// Replace spaces with underscores
	s = strings.ReplaceAll(s, " ", "_")
	// Remove any character that isn't alphanumeric or underscore
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
			return r
		}
		return -1
	}, s)
	return s
}
