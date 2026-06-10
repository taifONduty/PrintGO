package services

import (
	"context"
	"fmt"
	"log"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/pdfcpu/pdfcpu/pkg/api"
)

// libreofficeTimeout bounds the headless conversion shell-out.
const libreofficeTimeout = 30 * time.Second

// CheckLibreOffice logs a warning if the `libreoffice` binary is not on PATH.
// Conversion of DOCX/PPTX/images depends on it.
func CheckLibreOffice() {
	cmd := exec.Command("libreoffice", "--version")
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("WARNING: libreoffice not available (%v) — DOCX/PPTX/image conversion will fail", err)
		return
	}
	log.Printf("libreoffice detected: %s", strings.TrimSpace(string(out)))
}

// PrintReadyPDF produces a print-ready PDF from the saved original and returns
// its path. A PDF original is used as-is; everything else is converted via
// LibreOffice headless into the same job directory.
//
//	jobDir   — ./uploads/{job_id}
//	original — absolute path to original.{ext}
//	isPDF    — true when the upload was already a PDF
func PrintReadyPDF(ctx context.Context, jobDir, original string, isPDF bool) (string, error) {
	if isPDF {
		return original, nil
	}

	ctx, cancel := context.WithTimeout(ctx, libreofficeTimeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "libreoffice",
		"--headless", "--convert-to", "pdf", "--outdir", jobDir, original)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("libreoffice convert failed: %v: %s", err, strings.TrimSpace(string(out)))
	}

	// LibreOffice writes <basename>.pdf into outdir.
	base := strings.TrimSuffix(filepath.Base(original), filepath.Ext(original))
	pdfPath := filepath.Join(jobDir, base+".pdf")
	return pdfPath, nil
}

// PageCount returns the true total page count of a PDF using pdfcpu.
func PageCount(pdfPath string) (int, error) {
	n, err := api.PageCountFile(pdfPath)
	if err != nil {
		return 0, fmt.Errorf("page count: %w", err)
	}
	return n, nil
}
