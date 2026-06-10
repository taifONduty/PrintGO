package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"printervend/db"
	"printervend/models"
	"printervend/services"
)

// Pay handles POST /api/jobs/{job_id}/pay — initiates an SSLCommerz session.
func (a *App) Pay(w http.ResponseWriter, r *http.Request) {
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
	if job.Status != models.StatusCreated {
		writeErr(w, http.StatusConflict, "Payment has already been started for this job.")
		return
	}

	// Flip to pending_payment and create a pending payment row.
	if err := a.DB.SetStatus(r.Context(), id, models.StatusPendingPayment); err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not start payment.")
		return
	}
	paymentID, err := a.DB.CreatePayment(r.Context(), id, job.PriceTaka)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not create the payment.")
		return
	}

	base := a.Cfg.PublicBaseURL
	params := services.InitParams{
		TranID:      paymentID,
		Amount:      job.PriceTaka,
		SuccessURL:  fmt.Sprintf("%s/api/payment/return?job_id=%s&result=success", base, id),
		FailURL:     fmt.Sprintf("%s/api/payment/return?job_id=%s&result=failed", base, id),
		CancelURL:   fmt.Sprintf("%s/api/payment/return?job_id=%s&result=cancelled", base, id),
		IPNURL:      base + "/api/ipn",
		ProductName: "PrintGO print job",
	}

	resp, err := a.SSL.InitSession(r.Context(), params)
	if err != nil {
		// Roll the job back so the user can retry.
		_ = a.DB.SetStatus(r.Context(), id, models.StatusCreated)
		writeErr(w, http.StatusBadGateway, "Could not reach the payment gateway. Please try again.")
		return
	}

	if err := a.DB.SetPaymentSession(r.Context(), paymentID, resp.SessionKey); err != nil {
		// Non-fatal: session already created at the gateway.
		_ = err
	}

	writeJSON(w, http.StatusOK, map[string]string{"gateway_url": resp.GatewayPageURL})
}

// PaymentReturn handles GET|POST /api/payment/return — the browser-facing
// redirect target. It does NOT confirm payment; it only forwards the browser.
func (a *App) PaymentReturn(w http.ResponseWriter, r *http.Request) {
	jobID := r.URL.Query().Get("job_id")
	result := r.URL.Query().Get("result")
	front := a.Cfg.FrontendURL

	var dest string
	switch result {
	case "success":
		dest = fmt.Sprintf("%s/status/%s", front, jobID)
	case "failed":
		dest = fmt.Sprintf("%s/pay/%s?failed=true", front, jobID)
	case "cancelled":
		dest = fmt.Sprintf("%s/pay/%s?cancelled=true", front, jobID)
	default:
		dest = fmt.Sprintf("%s/pay/%s?failed=true", front, jobID)
	}
	http.Redirect(w, r, dest, http.StatusFound)
}

// IPN handles POST /api/ipn — the server-to-server source of truth.
func (a *App) IPN(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad form", http.StatusBadRequest)
		return
	}

	// SSLCommerz posts tran_id (our payment id) and val_id (validation handle).
	valID := r.PostFormValue("val_id")
	tranID := r.PostFormValue("tran_id")
	if tranID == "" {
		http.Error(w, "missing tran_id", http.StatusBadRequest)
		return
	}

	jobID, err := a.DB.JobIDForPayment(r.Context(), tranID)
	if err != nil {
		http.Error(w, "unknown payment", http.StatusBadRequest)
		return
	}

	// Capture the raw posted payload for the audit trail.
	payload, _ := json.Marshal(r.PostForm)

	// Re-verify against the validation API — never trust the raw callback.
	verified := false
	if valID != "" {
		v, vErr := a.SSL.ValidateIPN(r.Context(), valID)
		if vErr == nil && v.IsValid() {
			verified = true
		}
	}

	if verified {
		_ = a.DB.FinalizePayment(r.Context(), jobID, models.PaymentSuccess, payload)
		_ = a.DB.SetStatus(r.Context(), jobID, models.StatusPaid)
	} else {
		_ = a.DB.FinalizePayment(r.Context(), jobID, models.PaymentFailed, payload)
		_ = a.DB.SetStatus(r.Context(), jobID, models.StatusFailed)
	}

	// SSLCommerz expects a 200 with body "OK".
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("OK"))
}
