package handlers

import (
	"encoding/json"
	"net/http"

	"printervend/config"
	"printervend/db"
	"printervend/services"
)

// App holds the shared dependencies for all handlers.
type App struct {
	DB  *db.DB
	Cfg *config.Config
	SSL *services.SSLCommerz
}

// New builds the handler app.
func New(database *db.DB, cfg *config.Config) *App {
	return &App{
		DB:  database,
		Cfg: cfg,
		SSL: services.NewSSLCommerz(cfg.SSLStoreID, cfg.SSLStorePass, cfg.SSLSandbox),
	}
}

// writeJSON writes v as a JSON response with the given status.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeErr writes a {"error": msg} body with the given status.
func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// Health returns {"ok": true}.
func (a *App) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
