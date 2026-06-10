package db

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schemaSQL string

// DB wraps a pgx connection pool and exposes the query helpers used by the
// handlers. All access to PostgreSQL goes through this type.
type DB struct {
	pool *pgxpool.Pool
}

// Connect opens a pgx pool against the given DATABASE_URL.
func Connect(ctx context.Context, url string) (*DB, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping db: %w", err)
	}
	return &DB{pool: pool}, nil
}

// Migrate runs schema.sql. Uses CREATE TABLE IF NOT EXISTS so it is safe to
// run on every startup.
func (d *DB) Migrate(ctx context.Context) error {
	if _, err := d.pool.Exec(ctx, schemaSQL); err != nil {
		return fmt.Errorf("run schema: %w", err)
	}
	return nil
}

// Close releases the pool.
func (d *DB) Close() { d.pool.Close() }
