package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"printervend/config"
	"printervend/db"
	"printervend/handlers"
	"printervend/services"
)

func main() {
	cfg := config.Load()

	// Ensure uploads dir exists.
	if err := os.MkdirAll(cfg.UploadsDir, 0o755); err != nil {
		log.Fatalf("could not create uploads dir: %v", err)
	}

	// Warn if LibreOffice is missing (DOCX/PPTX/image conversion needs it).
	services.CheckLibreOffice()

	ctx := context.Background()
	database, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer database.Close()

	if err := database.Migrate(ctx); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	log.Println("database connected and schema ensured")

	app := handlers.New(database, cfg)

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS for the browser-facing API. Applied at the router root so preflight
	// (OPTIONS) requests are answered even on routes that only register other
	// methods. The IPN and machine endpoints are server-to-server, so the extra
	// CORS headers on them are harmless (no browser ever calls them).
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Route("/api", func(r chi.Router) {
		r.Get("/health", app.Health)

		// Browser-facing routes.
		r.Post("/upload", app.Upload)
		r.Get("/jobs/{job_id}", app.GetJob)
		r.Get("/jobs/{job_id}/files/{file_id}/content", app.FileContent)
		r.Post("/jobs/{job_id}/files", app.AddFile)
		r.Delete("/jobs/{job_id}/files/{file_id}", app.RemoveFile)
		r.Put("/jobs/{job_id}/config", app.UpdateConfig)
		r.Post("/jobs/{job_id}/pay", app.Pay)
		r.Get("/jobs/{job_id}/status", app.JobStatus)

		// Gateway return: browser is redirected here by SSLCommerz (POST), so
		// accept both methods. It issues a 302.
		r.Get("/payment/return", app.PaymentReturn)
		r.Post("/payment/return", app.PaymentReturn)

		// Server-to-server IPN.
		r.Post("/ipn", app.IPN)

		// PC polling script.
		r.Get("/machine/jobs/next", app.MachineNextJob)
		r.Post("/machine/jobs/{job_id}/status", app.MachineSetStatus)
	})

	addr := ":" + cfg.Port
	log.Printf("PrintGO backend listening on %s", addr)
	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server: %v", err)
	}
}
