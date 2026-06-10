package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"printervend/db"
	"printervend/models"
	"printervend/services"
)

const maxUploadBytes = 20 << 20 // 20MB per file

// acceptedMIME maps allowed upload MIME types to a file extension.
var acceptedMIME = map[string]string{
	"application/pdf": "pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":   "docx",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
	"image/jpeg": "jpg",
	"image/png":  "png",
}

func kindForMime(mime string) string {
	if mime == "image/jpeg" || mime == "image/png" {
		return models.KindImg
	}
	return models.KindDoc
}

// Upload handles POST /api/upload (multipart/form-data, one file).
// It creates a new job and attaches the first file.
func (a *App) Upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes+1<<20)
	if err := r.ParseMultipartForm(maxUploadBytes + 1<<20); err != nil {
		writeErr(w, http.StatusBadRequest, "File too large or malformed upload (max 20MB).")
		return
	}

	machineID := r.FormValue("machine_id")
	if machineID == "" {
		writeErr(w, http.StatusBadRequest, "machine_id is required.")
		return
	}
	ok, err := a.DB.MachineExists(r.Context(), machineID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not verify machine.")
		return
	}
	if !ok {
		writeErr(w, http.StatusBadRequest, "Unknown machine. Please rescan the QR code.")
		return
	}

	jobID := uuid.NewString()
	job := &models.Job{
		ID:        jobID,
		MachineID: machineID,
		Copies:    1,
		Status:    models.StatusCreated,
		PriceTaka: "0.00",
	}
	if err := a.DB.InsertJob(r.Context(), job); err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not create the print job.")
		return
	}

	if _, err := a.processUpload(w, r, jobID); err != nil {
		return // processUpload already wrote the error
	}

	full, err := a.repriceJob(r.Context(), jobID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not finalize the job.")
		return
	}
	writeJSON(w, http.StatusOK, full)
}

// AddFile handles POST /api/jobs/{job_id}/files — attach another file.
func (a *App) AddFile(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "job_id")

	job, err := a.DB.GetJob(r.Context(), jobID)
	if err == db.ErrNotFound {
		writeErr(w, http.StatusNotFound, "Job not found.")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not load the job.")
		return
	}
	if job.Status != models.StatusCreated {
		writeErr(w, http.StatusConflict, "This job can no longer be modified.")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes+1<<20)
	if err := r.ParseMultipartForm(maxUploadBytes + 1<<20); err != nil {
		writeErr(w, http.StatusBadRequest, "File too large or malformed upload (max 20MB).")
		return
	}

	if _, err := a.processUpload(w, r, jobID); err != nil {
		return
	}

	full, err := a.repriceJob(r.Context(), jobID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not finalize the job.")
		return
	}
	writeJSON(w, http.StatusOK, full)
}

// RemoveFile handles DELETE /api/jobs/{job_id}/files/{file_id}.
func (a *App) RemoveFile(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "job_id")
	fileID := chi.URLParam(r, "file_id")

	job, err := a.DB.GetJob(r.Context(), jobID)
	if err == db.ErrNotFound {
		writeErr(w, http.StatusNotFound, "Job not found.")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not load the job.")
		return
	}
	if job.Status != models.StatusCreated {
		writeErr(w, http.StatusConflict, "This job can no longer be modified.")
		return
	}

	if err := a.DB.DeleteFile(r.Context(), jobID, fileID); err != nil {
		if err == db.ErrNotFound {
			writeErr(w, http.StatusNotFound, "File not found.")
			return
		}
		writeErr(w, http.StatusInternalServerError, "Could not remove the file.")
		return
	}
	// Best-effort cleanup of the file's directory.
	if dir, derr := filepath.Abs(filepath.Join(a.Cfg.UploadsDir, jobID, fileID)); derr == nil {
		os.RemoveAll(dir)
	}
	_ = a.DB.RecalcPageCount(r.Context(), jobID)

	full, err := a.repriceJob(r.Context(), jobID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not finalize the job.")
		return
	}
	writeJSON(w, http.StatusOK, full)
}

// processUpload validates the "file" form field, saves it, produces a
// print-ready PDF, counts pages, and inserts the file row. On error it writes
// the HTTP error and returns a non-nil error so the caller can stop.
func (a *App) processUpload(w http.ResponseWriter, r *http.Request, jobID string) (*models.File, error) {
	file, header, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "A file is required.")
		return nil, err
	}
	defer file.Close()

	if header.Size > maxUploadBytes {
		writeErr(w, http.StatusRequestEntityTooLarge, "File exceeds the 20MB limit.")
		return nil, fmt.Errorf("too large")
	}

	mime := header.Header.Get("Content-Type")
	ext, accepted := acceptedMIME[mime]
	if !accepted {
		writeErr(w, http.StatusUnsupportedMediaType, "Unsupported file type. Accepted: PDF, DOCX, PPTX, JPG, PNG.")
		return nil, fmt.Errorf("bad mime")
	}

	fileID := uuid.NewString()
	fileDir, err := filepath.Abs(filepath.Join(a.Cfg.UploadsDir, jobID, fileID))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not resolve upload path.")
		return nil, err
	}
	if err := os.MkdirAll(fileDir, 0o755); err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not create upload directory.")
		return nil, err
	}

	originalPath := filepath.Join(fileDir, "original."+ext)
	if err := saveFile(originalPath, file); err != nil {
		os.RemoveAll(fileDir)
		writeErr(w, http.StatusInternalServerError, "Could not save the uploaded file.")
		return nil, err
	}

	isPDF := ext == "pdf"
	pdfPath, err := services.PrintReadyPDF(r.Context(), fileDir, originalPath, isPDF)
	if err != nil {
		os.RemoveAll(fileDir)
		writeErr(w, http.StatusUnprocessableEntity, "Could not convert the document to PDF.")
		return nil, err
	}

	pageCount, err := services.PageCount(pdfPath)
	if err != nil || pageCount < 1 {
		pageCount = 1
	}

	f := &models.File{
		ID:               fileID,
		JobID:            jobID,
		OriginalFilename: header.Filename,
		FilePath:         pdfPath,
		FileMime:         mime,
		PageCount:        pageCount,
		Kind:             kindForMime(mime),
	}
	if err := a.DB.InsertFile(r.Context(), f); err != nil {
		os.RemoveAll(fileDir)
		writeErr(w, http.StatusInternalServerError, "Could not record the file.")
		return nil, err
	}
	_ = a.DB.RecalcPageCount(r.Context(), jobID)
	return f, nil
}

func saveFile(path string, src io.Reader) error {
	dst, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create file: %w", err)
	}
	defer dst.Close()
	if _, err := io.Copy(dst, src); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	return nil
}

// repriceJob recomputes and persists the job price from its current config and
// files, returning the refreshed job.
func (a *App) repriceJob(ctx context.Context, jobID string) (*models.Job, error) {
	job, err := a.DB.GetJob(ctx, jobID)
	if err != nil {
		return nil, err
	}
	price := services.Price(services.PriceInput{
		PageCount:     job.PageCount,
		FilesCount:    len(job.Files),
		Copies:        job.Copies,
		Color:         job.Color,
		PageRangeFrom: job.PageRangeFrom,
		PageRangeTo:   job.PageRangeTo,
	}, a.rates())
	if err := a.DB.SetPrice(ctx, jobID, price); err != nil {
		return nil, err
	}
	job.PriceTaka = price
	return job, nil
}

// rates builds the pricing config from app config.
func (a *App) rates() services.Rates {
	return services.Rates{
		BW:         a.Cfg.BWRate,
		Color:      a.Cfg.ColorRate,
		ServiceFee: a.Cfg.ServiceFee,
		MinOrder:   a.Cfg.MinOrder,
	}
}
