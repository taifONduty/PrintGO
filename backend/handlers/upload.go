package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"printervend/models"
	"printervend/services"
)

const maxUploadBytes = 20 << 20 // 20MB

// acceptedMIME maps allowed upload MIME types to a file extension.
var acceptedMIME = map[string]string{
	"application/pdf": "pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":   "docx",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
	"image/jpeg": "jpg",
	"image/png":  "png",
}

// Upload handles POST /api/upload (multipart/form-data).
func (a *App) Upload(w http.ResponseWriter, r *http.Request) {
	// Cap the request body to maxUploadBytes (+ small multipart overhead).
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

	file, header, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "A file is required.")
		return
	}
	defer file.Close()

	if header.Size > maxUploadBytes {
		writeErr(w, http.StatusRequestEntityTooLarge, "File exceeds the 20MB limit.")
		return
	}

	mime := header.Header.Get("Content-Type")
	ext, accepted := acceptedMIME[mime]
	if !accepted {
		writeErr(w, http.StatusUnsupportedMediaType, "Unsupported file type. Accepted: PDF, DOCX, PPTX, JPG, PNG.")
		return
	}

	jobID := uuid.NewString()
	jobDir, err := filepath.Abs(filepath.Join(a.Cfg.UploadsDir, jobID))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not resolve upload path.")
		return
	}
	if err := os.MkdirAll(jobDir, 0o755); err != nil {
		writeErr(w, http.StatusInternalServerError, "Could not create upload directory.")
		return
	}

	// Save raw upload as original.{ext}.
	originalPath := filepath.Join(jobDir, "original."+ext)
	if err := saveFile(originalPath, file); err != nil {
		os.RemoveAll(jobDir)
		writeErr(w, http.StatusInternalServerError, "Could not save the uploaded file.")
		return
	}

	// Produce a print-ready PDF.
	isPDF := ext == "pdf"
	pdfPath, err := services.PrintReadyPDF(r.Context(), jobDir, originalPath, isPDF)
	if err != nil {
		os.RemoveAll(jobDir)
		writeErr(w, http.StatusUnprocessableEntity, "Could not convert the document to PDF.")
		return
	}

	// Count pages. Images convert to a single page; pdfcpu still reports it.
	pageCount, err := services.PageCount(pdfPath)
	if err != nil || pageCount < 1 {
		pageCount = 1
	}

	price := services.Price(services.PriceInput{
		PageCount: pageCount,
		Copies:    1,
		Color:     false,
	}, a.rates())

	job := &models.Job{
		ID:               jobID,
		MachineID:        machineID,
		OriginalFilename: header.Filename,
		FilePath:         pdfPath,
		FileMime:         mime,
		PageCount:        pageCount,
		Color:            false,
		Copies:           1,
		Duplex:           false,
		PriceTaka:        price,
		Status:           models.StatusCreated,
	}

	saved, err := a.DB.InsertJob(r.Context(), job)
	if err != nil {
		os.RemoveAll(jobDir)
		writeErr(w, http.StatusInternalServerError, "Could not create the print job.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"job_id":     saved.ID,
		"page_count": saved.PageCount,
		"filename":   saved.OriginalFilename,
	})
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

// rates builds the pricing config from app config.
func (a *App) rates() services.Rates {
	return services.Rates{BW: a.Cfg.BWRate, Color: a.Cfg.ColorRate, MinOrder: a.Cfg.MinOrder}
}
