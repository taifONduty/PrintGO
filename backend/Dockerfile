# syntax=docker/dockerfile:1

# ── build stage ──────────────────────────────────────────────────────────────
FROM golang:1.25-bookworm AS build
WORKDIR /src

# Cache deps first.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# pgx and pdfcpu are pure Go, so a static CGO-free binary is fine.
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/printervend .

# ── runtime stage ────────────────────────────────────────────────────────────
# LibreOffice (+ JRE) is required to convert DOCX/PPTX/images to PDF.
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-core \
      libreoffice-writer \
      libreoffice-impress \
      libreoffice-draw \
      default-jre-headless \
      poppler-utils \
      fonts-liberation \
      ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /out/printervend /app/printervend

# Uploads live on a volume so they survive container restarts.
ENV PORT=8080 \
    UPLOADS_DIR=/data/uploads
RUN mkdir -p /data/uploads
VOLUME ["/data/uploads"]

EXPOSE 8080
CMD ["/app/printervend"]
