# PrintGO — Printing Vending Machine Web App

A mobile-first web app for a self-service printing kiosk. A user scans a QR code
on the machine, then moves through a strictly linear flow:

> **scan QR → upload document → configure print settings → pay → printer prints**

This is a **prototype**. The printer is a USB printer on a PC running Pop!\_OS
with CUPS. A separate polling script (not part of this repo) runs on that PC and
consumes `paid` jobs from the backend.

The UI follows the **PrintGO** design system — warm-amber, clean-utilitarian,
Plus Jakarta Sans, Bangladeshi Taka pricing.

---

## Stack

| Layer        | Choice                                                         |
| ------------ | -------------------------------------------------------------- |
| Frontend     | Next.js 16 (App Router), TypeScript, Tailwind v4               |
| Backend      | Go (chi router, pgx/v5)                                        |
| Database     | Supabase-hosted PostgreSQL (direct pgx connection)            |
| Payments     | SSLCommerz (sandbox)                                           |
| File storage | Local disk — `backend/uploads/{job_id}/`                       |

---

## Repository layout

```
/
├── backend/     # Go API server
│   ├── config/      # env loading
│   ├── db/          # pgx pool, schema.sql (embedded), queries
│   ├── handlers/    # upload, jobs, payment, machine, health
│   ├── models/      # Job + status constants
│   ├── services/    # pdf (libreoffice + pdfcpu), sslcommerz, pricing
│   └── main.go
├── frontend/    # Next.js app
│   ├── app/         # upload, configure/[jobId], pay/[jobId], status/[jobId]
│   ├── components/  # design system + FileDropzone, PrintConfigForm, StatusPoller
│   └── lib/         # theme tokens, typed API client
└── README.md
```

---

## Quick start with Docker (backend + DB)

The backend is containerized with LibreOffice baked in, so DOCX/PPTX/image
conversion works out of the box. `docker-compose.yml` runs the backend plus a
local Postgres:

```bash
docker compose up --build
# backend → http://localhost:8080  (health: /api/health)
# db      → localhost:5432
```

Schema is created and `VM001` seeded automatically. Then run the frontend
(`cd frontend && npm install && npm run dev`) — it points at `http://localhost:8080`
by default — and open `http://localhost:3000/upload?machine=VM001`.

For real SSLCommerz callbacks, expose the backend with a tunnel and pass its URL:

```bash
PUBLIC_BASE_URL=https://xxxx.trycloudflare.com docker compose up --build
```

To run the backend without containers, follow the manual steps below.

---

## Prerequisites

- **Go** 1.24+
- **Node** 18+ and npm
- **LibreOffice** — required to convert DOCX/PPTX/images to PDF.
  Without it, only direct PDF uploads work (the backend logs a warning at
  startup). Install with `sudo apt install libreoffice` (Pop!\_OS) or
  `brew install --cask libreoffice` (macOS).
- A **Supabase** project (or any PostgreSQL 14+ database).

`pdfcpu` is a Go library and is vendored via `go.mod` — no separate install.

---

## 1. Database (Supabase)

1. Create a Supabase project.
2. Go to **Settings → Database → Connection string → URI**. Use the **direct
   connection** URI (port `5432`), **not** the pooler/transaction URL.
   It looks like:
   ```
   postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   ```
3. Put that string in `backend/.env` as `DATABASE_URL` (next step).

The schema is created automatically on backend startup (`CREATE TABLE IF NOT
EXISTS`), and machine `VM001` is seeded.

---

## 2. Backend

```bash
cd backend
cp .env.example .env      # then edit .env
go mod tidy               # first run only
go run .
```

### `backend/.env`

```env
PORT=8080
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
UPLOADS_DIR=./uploads

FRONTEND_URL=http://localhost:3000
PUBLIC_BASE_URL=https://your-tunnel-subdomain.example.com

BW_RATE_TAKA=2.00
COLOR_RATE_TAKA=5.00
MIN_ORDER_TAKA=10.00

SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASS=your_store_pass
SSLCOMMERZ_SANDBOX=true
```

> `godotenv` does **not** expand `${...}` — every value must be a literal.

Verify it's up: `curl http://localhost:8080/api/health` → `{"ok":true}`.

### Tunnel for `PUBLIC_BASE_URL`

SSLCommerz must reach your backend's callback URLs from the public internet.
In dev, expose port 8080 with a tunnel and set `PUBLIC_BASE_URL` to its URL:

```bash
# pick one
cloudflared tunnel --url http://localhost:8080
ngrok http 8080
```

Copy the generated `https://…` URL into `PUBLIC_BASE_URL` and restart the
backend. The success/fail/cancel and IPN callback URLs are built from it at
request time.

---

## 3. Frontend

```bash
cd frontend
cp .env.example .env.local   # defaults to http://localhost:8080
npm install                  # first run only
npm run dev
```

Open the flow with a machine id (this is what the QR encodes):

```
http://localhost:3000/upload?machine=VM001
```

Without `?machine=…` the upload screen shows "Invalid QR code — please rescan"
and blocks upload (the `machine_id` is the prototype's only access control).

---

## Flow & API

A job holds **multiple files**. The frontend flow is 5 steps + status:

| Step      | Frontend route          | Backend endpoint                                   |
| --------- | ----------------------- | -------------------------------------------------- |
| Upload    | `/upload?machine=VM001` | `POST /api/upload` (1st file → creates job)        |
|           |                         | `POST /api/jobs/{id}/files` (add), `DELETE …/files/{fileId}` (remove) |
| Configure | `/configure/{jobId}`    | `GET /api/jobs/{id}`, `PUT …/config`               |
| Review    | `/review/{jobId}`       | `GET /api/jobs/{id}`                               |
| Verify    | `/verify/{jobId}`       | — (client-side OTP demo, code `1234`, no SMS)      |
| Pay       | `/pay/{jobId}`          | `POST /api/jobs/{id}/pay` → gateway                |
| Return    | (gateway → backend)     | `GET\|POST /api/payment/return` → 302              |
| Confirm   | —                       | `POST /api/ipn` (source of truth)                  |
| Status    | `/status/{jobId}`       | `GET /api/jobs/{id}/status` (polled 3s)            |

A job's `page_count` is the **aggregate** across its files. Each file is saved
under `uploads/{job_id}/{file_id}/` and gets its own print-ready PDF.

Pricing (backend, configurable via env):

```
total_pages     = sum(file.page_count for file in job.files)
effective_pages = (page range set) ? to - from + 1 : total_pages
per_page_rate   = color ? COLOR_RATE_TAKA : BW_RATE_TAKA
price_taka      = effective_pages × copies × per_page_rate
                  + SERVICE_FEE_TAKA (when the job has files)     (min MIN_ORDER_TAKA)
```

Duplex has no price effect (print instruction only). Money is returned as a
2-decimal string (e.g. `"20.00"`).

### Endpoints for the PC polling script (not in this repo)

- `GET  /api/machine/jobs/next?machine_id=VM001` — atomically claims the oldest
  `paid` job (`FOR UPDATE SKIP LOCKED`), flips it to `queued`, returns the full
  job incl. its `files` array (each with a `file_path` to print). `204` when none
  waiting.
- `POST /api/machine/jobs/{job_id}/status` — body
  `{ "status": "printing" | "completed" | "failed", "message": "..." }`.

---

## Notes

- **CORS** is applied only to the browser-facing routes for `FRONTEND_URL`.
  `/api/ipn` and `/api/machine/*` are server-to-server and need none.
- **Uploads**: files live under `backend/uploads/{job_id}/{file_id}/`. There is
  no cleanup automation — clear this directory periodically in a real deployment.
- **No real authentication** — the `machine_id` is the only access control. The
  Verify/OTP screen is a UX demo from the design (fixed code `1234`, no SMS
  backend); it does not gate anything server-side.
- **Design fidelity**: the full 7-screen PrintGO design is implemented —
  multi-file upload grid + page-preview sheet, configure breakdown, separate
  Review and Verify screens, 5-step rail, tokens, and components.
```
