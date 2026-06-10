package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"printervend/db"
	"printervend/models"
)

// MachineNextJob handles GET /api/machine/jobs/next?machine_id=VM001.
// For the PC polling script only. Atomically claims the oldest paid job.
func (a *App) MachineNextJob(w http.ResponseWriter, r *http.Request) {
	machineID := r.URL.Query().Get("machine_id")
	if machineID == "" {
		writeErr(w, http.StatusBadRequest, "machine_id is required.")
		return
	}

	job, err := a.DB.ClaimNextJob(r.Context(), machineID)
	if errors.Is(err, db.ErrNotFound) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not claim a job.")
		return
	}
	writeJSON(w, http.StatusOK, job)
}

// machineStatusReq is the body for POST /api/machine/jobs/{job_id}/status.
type machineStatusReq struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// validMachineStatus is the set of statuses the polling script may set.
var validMachineStatus = map[string]bool{
	models.StatusPrinting:  true,
	models.StatusCompleted: true,
	models.StatusFailed:    true,
}

// MachineSetStatus handles POST /api/machine/jobs/{job_id}/status.
// For the PC polling script only.
func (a *App) MachineSetStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "job_id")

	var req machineStatusReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "Invalid request body.")
		return
	}
	if !validMachineStatus[req.Status] {
		writeErr(w, http.StatusBadRequest, "Invalid status. Allowed: printing, completed, failed.")
		return
	}

	if err := a.DB.SetStatus(r.Context(), id, req.Status); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeErr(w, http.StatusNotFound, "Job not found.")
			return
		}
		writeErr(w, http.StatusInternalServerError, "Could not update job status.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
