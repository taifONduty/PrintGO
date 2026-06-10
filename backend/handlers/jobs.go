package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"printervend/db"
	"printervend/models"
	"printervend/services"
)

// GetJob handles GET /api/jobs/{job_id}.
func (a *App) GetJob(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "job_id")
	job, err := a.DB.GetJob(r.Context(), id)
	if errors.Is(err, db.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "Job not found.")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not load the job.")
		return
	}
	writeJSON(w, http.StatusOK, job)
}

// configReq is the body for PUT /api/jobs/{job_id}/config.
type configReq struct {
	Color         bool `json:"color"`
	Copies        int  `json:"copies"`
	Duplex        bool `json:"duplex"`
	PageRangeFrom *int `json:"page_range_from"`
	PageRangeTo   *int `json:"page_range_to"`
}

// UpdateConfig handles PUT /api/jobs/{job_id}/config.
func (a *App) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "job_id")

	var req configReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "Invalid request body.")
		return
	}

	job, err := a.DB.GetJob(r.Context(), id)
	if errors.Is(err, db.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "Job not found.")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not load the job.")
		return
	}
	if job.Status != models.StatusCreated {
		writeErr(w, http.StatusConflict, "This job can no longer be reconfigured.")
		return
	}

	if req.Copies < 1 || req.Copies > 99 {
		writeErr(w, http.StatusBadRequest, "Copies must be between 1 and 99.")
		return
	}

	from, to, err := validateRange(req.PageRangeFrom, req.PageRangeTo, job.PageCount)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	price := services.Price(services.PriceInput{
		PageCount:     job.PageCount,
		Copies:        req.Copies,
		Color:         req.Color,
		PageRangeFrom: from,
		PageRangeTo:   to,
	}, a.rates())

	updated, err := a.DB.UpdateConfig(r.Context(), id, req.Color, req.Copies, req.Duplex, from, to, price)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not update the job.")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// validateRange normalizes and validates an optional page range against the
// document's page count. Both ends must be set together; otherwise the range is
// cleared (print all). Returns the (possibly nil) bounds to persist.
func validateRange(from, to *int, pageCount int) (*int, *int, error) {
	if from == nil && to == nil {
		return nil, nil, nil
	}
	if from == nil || to == nil {
		return nil, nil, errors.New("Both page_range_from and page_range_to must be set, or both null.")
	}
	if *from < 1 || *to < *from || *to > pageCount {
		return nil, nil, errors.New("Page range is out of bounds.")
	}
	return from, to, nil
}

// JobStatus handles GET /api/jobs/{job_id}/status — a lightweight poll.
func (a *App) JobStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "job_id")
	job, err := a.DB.GetJob(r.Context(), id)
	if errors.Is(err, db.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "Job not found.")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not load the job.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  job.Status,
		"message": statusMessage(job.Status),
	})
}

// statusMessage maps a job status to a user-facing message.
func statusMessage(status string) string {
	switch status {
	case models.StatusPendingPayment:
		return "Waiting for payment confirmation..."
	case models.StatusPaid:
		return "Payment confirmed, queued for printing..."
	case models.StatusQueued:
		return "Your job is in the print queue..."
	case models.StatusPrinting:
		return "Printing now..."
	case models.StatusCompleted:
		return "Done! Collect your documents."
	case models.StatusFailed:
		return "Something went wrong. Please contact support."
	default:
		return "Preparing your job..."
	}
}
