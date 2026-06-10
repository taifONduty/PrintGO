package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration, loaded from environment.
type Config struct {
	Port          string
	DatabaseURL   string
	UploadsDir    string
	FrontendURL   string
	PublicBaseURL string

	BWRate    float64
	ColorRate float64
	MinOrder  float64

	SSLStoreID   string
	SSLStorePass string
	SSLSandbox   bool
}

// Load reads .env (if present) and the process environment into a Config.
// Missing optional values fall back to sane defaults; required values that
// are absent cause a fatal log so misconfiguration fails fast at startup.
func Load() *Config {
	// .env is optional in production; ignore the not-found error.
	if err := godotenv.Load(); err != nil {
		log.Printf("config: no .env file loaded (%v) — relying on process env", err)
	}

	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: mustEnv("DATABASE_URL"),
		UploadsDir:  getEnv("UPLOADS_DIR", "./uploads"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
		// On Render, PUBLIC_BASE_URL falls back to the auto-injected
		// RENDER_EXTERNAL_URL (this service's public https URL) when unset.
		PublicBaseURL: getEnv("PUBLIC_BASE_URL", getEnv("RENDER_EXTERNAL_URL", "http://localhost:8080")),
		BWRate:        getFloat("BW_RATE_TAKA", 2.00),
		ColorRate:     getFloat("COLOR_RATE_TAKA", 5.00),
		MinOrder:      getFloat("MIN_ORDER_TAKA", 10.00),
		SSLStoreID:    getEnv("SSLCOMMERZ_STORE_ID", ""),
		SSLStorePass:  getEnv("SSLCOMMERZ_STORE_PASS", ""),
		SSLSandbox:    getBool("SSLCOMMERZ_SANDBOX", true),
	}
	return cfg
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("config: required env var %s is not set", key)
	}
	return v
}

func getFloat(key string, def float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
		log.Printf("config: %s is not a valid float, using default %.2f", key, def)
	}
	return def
}

func getBool(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
		log.Printf("config: %s is not a valid bool, using default %v", key, def)
	}
	return def
}
