# Claude Code Prompt — Printing Vending Machine Web App

## Project Overview

Build a **printing vending machine web app** — a mobile-first web interface that users reach
by scanning a QR code on a physical vending machine. The flow is strictly linear:
scan QR → upload document → configure print settings → pay → printer starts printing.

This is a **prototype**. The printer is a USB printer connected to a PC running Pop!_OS
with CUPS installed. A separate polling script (NOT part of this build) will run on that PC
and consume print jobs from the backend.

---

## Tech Stack

| Layer        | Choice                                                        |
|--------------|---------------------------------------------------------------|
| Frontend     | Next.js (App Router) — latest stable, TypeScript, Tailwind CSS |
| Backend      | Go (chi router, pgx/v5)                                       |
| Database     | Supabase-hosted PostgreSQL (direct pgx connection)            |
| Payments     | SSLCommerz (sandbox mode)                                    |
| File storage | Local disk — `./uploads/{job_id}/`                            |

Use the current stable Next.js via `create-next-app` — do NOT pin to an old major version.

---

## Repository Structure

```
/
├── frontend/          # Next.js app
│   ├── app/
│   │   ├── page.tsx                    # Redirect to /upload
│   │   ├── upload/page.tsx             # Step 1: file upload
│   │   ├── configure/[jobId]/page.tsx  # Step 2: print config + price
│   │   ├── pay/[jobId]/page.tsx        # Step 3: confirm + redirect to gateway
│   │   └── status/[jobId]/page.tsx     # Step 4: payment + print status
│   ├── components/
│   │   ├── FileDropzone.tsx
│   │   ├── PrintConfigForm.tsx
│   │   └── StatusPoller.tsx
│   └── lib/
│       └── api.ts                      # typed fetch wrappers for the Go API
│
├── backend/           # Go API server
│   ├── main.go
│   ├── db/
│   │   ├── schema.sql
│   │   └── queries.go
│   ├── handlers/
│   │   ├── upload.go
│   │   ├── jobs.go
│   │   ├── payment.go                  # pay-init, gateway return, IPN
│   │   └── machine.go
│   ├── services/
│   │   ├── pdf.go         # page count + LibreOffice conversion
│   │   └── sslcommerz.go
│   └── .env.example
│
└── README.md          # setup + run instructions for both apps
```

---

## Database Schema

Run on startup if tables don't exist (use `CREATE TABLE IF NOT EXISTS`).

```sql
CREATE TABLE IF NOT EXISTS machines (
    id          TEXT PRIMARY KEY,        -- e.g. "VM001"
    name        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'online',
    last_seen   TIMESTAMPTZ
);

INSERT INTO machines (id, name) VALUES ('VM001', 'Prototype Printer')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS jobs (
    id                UUID PRIMARY KEY,   -- generated app-side, see upload flow
    machine_id        TEXT NOT NULL REFERENCES machines(id),
    original_filename TEXT NOT NULL,
    file_path         TEXT NOT NULL,      -- absolute path to the PRINT-READY PDF
    file_mime         TEXT NOT NULL,      -- mime of the original upload
    page_count        INT NOT NULL,       -- true total page count of the document
    color             BOOLEAN NOT NULL DEFAULT false,
    copies            INT NOT NULL DEFAULT 1,
    duplex            BOOLEAN NOT NULL DEFAULT false,
    page_range_from   INT,                -- NULL = print all pages
    page_range_to     INT,
    price_taka        NUMERIC(10,2) NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'created',
    -- created | pending_payment | paid | queued | printing | completed | failed
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id             UUID NOT NULL REFERENCES jobs(id),
    gateway_session_id TEXT,
    amount_taka        NUMERIC(10,2) NOT NULL,
    status             TEXT NOT NULL DEFAULT 'pending',
    -- pending | success | failed | cancelled
    ipn_payload        JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Pricing Logic (backend, configurable via env)

```
effective_pages = (page_range set) ? (page_range_to - page_range_from + 1) : page_count
per_page_rate   = color ? COLOR_RATE_TAKA : BW_RATE_TAKA
price_taka      = effective_pages × copies × per_page_rate

# Enforce a minimum so the payment gateway accepts the transaction
if price_taka < MIN_ORDER_TAKA: price_taka = MIN_ORDER_TAKA
```

`page_count` column always stores the true document total; `effective_pages` is computed
only for pricing and is NOT persisted separately. Duplex has no price effect in v1 — it is
a print instruction only.

Defaults: `BW_RATE_TAKA=2.00`, `COLOR_RATE_TAKA=5.00`, `MIN_ORDER_TAKA=10.00`

> Note: SSLCommerz sandbox rejects very small amounts. `MIN_ORDER_TAKA` guards against this.

All money values are returned in JSON as **strings** with 2 decimals (e.g. `"20.00"`) to
avoid float rounding issues.

---

## Backend API Endpoints

All routes prefixed `/api`. JSON in/out unless noted. Errors return
`{ "error": "human readable message" }` with an appropriate HTTP status.

### `GET /api/health`
Returns `{ "ok": true }`. Used to verify the server is up.

### `POST /api/upload`
- **Content-Type:** `multipart/form-data`
- **Fields:** `file`, `machine_id`
- **Validation:**
  - Max file size: 20MB
  - Accepted MIME: `application/pdf`,
    `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (docx),
    `application/vnd.openxmlformats-officedocument.presentationml.presentation` (pptx),
    `image/jpeg`, `image/png`
  - Reject if `machine_id` not found in DB
- **Processing (in this order):**
  1. Generate a job UUID app-side (`github.com/google/uuid`)
  2. Create directory `./uploads/{job_id}/`
  3. Save the raw upload as `original.{ext}`
  4. Produce a print-ready PDF:
     - PDF upload → use as-is
     - DOCX/PPTX → `libreoffice --headless --convert-to pdf --outdir ./uploads/{job_id}/ original.{ext}` (shell out, 30s timeout)
     - JPG/PNG → also convert via LibreOffice to a single-page PDF; treat page_count as 1
  5. Count pages of the print-ready PDF with `pdfcpu` (`api.PageCountFile`)
  6. Insert the job row with the generated UUID, `file_path` = the PDF, status `created`,
     defaults (B&W, 1 copy, no duplex, all pages), and computed `price_taka`
- **Response 200:** `{ "job_id": "uuid", "page_count": 5, "filename": "invoice.pdf" }`

### `GET /api/jobs/{job_id}`
Return the full job object (frontend loads config + summary + status pages from this).

### `PUT /api/jobs/{job_id}/config`
Update print configuration and recalculate price.
- **Validation:** `copies` 1–99; page range within `page_count`; job must be `created`
- **Body:**
```json
{ "color": false, "copies": 2, "duplex": false, "page_range_from": null, "page_range_to": null }
```
- **Response 200:** full job object with recalculated `price_taka`

### `POST /api/jobs/{job_id}/pay`
Initiate payment — creates an SSLCommerz session.
- **Validation:** job must be `created`
- **Processing:**
  1. Flip job status to `pending_payment`
  2. Create a `payments` row (status `pending`)
  3. Call SSLCommerz init with `amount = price_taka` and these callback URLs, all built at
     runtime against `PUBLIC_BASE_URL` (the backend's publicly reachable URL):
     - `success_url = {PUBLIC_BASE_URL}/api/payment/return?job_id={job_id}&result=success`
     - `fail_url    = {PUBLIC_BASE_URL}/api/payment/return?job_id={job_id}&result=failed`
     - `cancel_url  = {PUBLIC_BASE_URL}/api/payment/return?job_id={job_id}&result=cancelled`
     - `ipn_url     = {PUBLIC_BASE_URL}/api/ipn`
  4. Store the returned session id on the payment row
- **Response 200:** `{ "gateway_url": "https://sandbox.sslcommerz.com/..." }`

### `GET|POST /api/payment/return`
The browser-facing return endpoint. SSLCommerz redirects the user's browser here (it uses
**POST**, so this route MUST accept both GET and POST). This endpoint does NOT mark the job
paid — it only redirects the browser onward:
- `result=success`   → 302 to `{FRONTEND_URL}/status/{job_id}`
- `result=failed`    → 302 to `{FRONTEND_URL}/pay/{job_id}?failed=true`
- `result=cancelled` → 302 to `{FRONTEND_URL}/pay/{job_id}?cancelled=true`

### `POST /api/ipn`
SSLCommerz server-to-server callback — **the source of truth** for payment confirmation.
- **Processing:**
  1. Re-verify the IPN against the SSLCommerz validation API (do not trust the raw callback)
  2. On verified success → job status `paid`, payment status `success`
  3. On failure → payment status `failed`, job status `failed`
  4. Store the raw payload in `payments.ipn_payload`
- **Response:** `200 OK` with body `OK` (SSLCommerz expects this)

### `GET /api/jobs/{job_id}/status`
Lightweight poll — frontend calls every 3s on the status page.
- **Response 200:** `{ "status": "paid", "message": "..." }`

Status → message map:
- `pending_payment` → "Waiting for payment confirmation..."
- `paid` → "Payment confirmed, queued for printing..."
- `queued` → "Your job is in the print queue..."
- `printing` → "Printing now..."
- `completed` → "Done! Collect your documents."
- `failed` → "Something went wrong. Please contact support."

### `GET /api/machine/jobs/next?machine_id=VM001`
**For the PC polling script only.** Atomically claim the oldest `paid` job for that machine
(`SELECT ... FOR UPDATE SKIP LOCKED`), flip it to `queued`, and update the machine's
`last_seen`. Returns the full job object incl. `file_path`. **204** if no jobs waiting.

### `POST /api/machine/jobs/{job_id}/status`
**For the PC polling script only.** Update job status.
- **Body:** `{ "status": "printing" | "completed" | "failed", "message": "optional" }`
- **Response 200:** `{ "ok": true }`

---

## Backend Environment Variables (`.env.example`)

`godotenv` does NOT expand `${...}`; every value must be a literal. No per-request values
(like job ids) belong in env — callback URLs are built in code at request time.

```env
PORT=8080
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
UPLOADS_DIR=./uploads

# Where the user's browser is sent after payment (frontend origin)
FRONTEND_URL=http://localhost:3000
# Publicly reachable URL of THIS backend (a tunnel in dev), used for SSLCommerz callbacks
PUBLIC_BASE_URL=https://your-tunnel-subdomain.example.com

BW_RATE_TAKA=2.00
COLOR_RATE_TAKA=5.00
MIN_ORDER_TAKA=10.00

SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASS=your_store_pass
SSLCOMMERZ_SANDBOX=true
```

---

## Frontend Pages

### `/upload?machine=VM001` — Step 1
- File dropzone (`react-dropzone`) accepting PDF, DOCX, PPTX, JPG, PNG
- Show max size (20MB) and accepted formats
- Read `machine` from the URL query; if missing, show "Invalid QR code — please rescan" and block upload
- POST to `/api/upload` with `machine_id`; show an upload progress bar
- On success → navigate to `/configure/{job_id}`

### `/configure/[jobId]` — Step 2
- Fetch job on load (`GET /api/jobs/{jobId}`)
- Show filename and page count
- Controls: color toggle (default B&W), copies stepper (1–99), duplex toggle (default single),
  optional page range ("Print all" by default; unchecking reveals from/to inputs)
- On any change, call `PUT /api/jobs/{jobId}/config` and show the live price
- Prominent price display: large, centered **৳ 20.00**
- "Proceed to Pay" → `/pay/{jobId}`

### `/pay/[jobId]` — Step 3
- Fetch job for a summary (filename, pages, config, total)
- "Pay ৳ {price}" button → `POST /api/jobs/{jobId}/pay` → `window.location.href = gateway_url`
- If `?failed=true` / `?cancelled=true` in URL, show the relevant message + a retry button

### `/status/[jobId]` — Step 4
- Poll `GET /api/jobs/{jobId}/status` every 3s
- Animated spinner for `pending_payment` | `paid` | `queued` | `printing`
- Green check + "Done! Collect your documents." for `completed`
- Red error state for `failed`
- No back button — end of flow

### Frontend env (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## Implementation Notes

- **CORS:** allow the `FRONTEND_URL` origin for GET/POST/PUT with `Content-Type`. The
  `/api/ipn` and `/api/machine/*` endpoints are not browser-called and need no CORS.
- **Mobile-first:** every page must look right at a 390px viewport.
- **No authentication** — the QR URL's `machine_id` is the only access control for the prototype.
- **LibreOffice:** assume installed; on startup run `libreoffice --version` and log a warning if missing.
- **Migrations:** execute `schema.sql` on backend startup (no separate migration tool).
- **Go modules:** `go mod init printervend` with `github.com/go-chi/chi/v5`,
  `github.com/go-chi/cors`, `github.com/jackc/pgx/v5`, `github.com/pdfcpu/pdfcpu`,
  `github.com/google/uuid`, `github.com/joho/godotenv`.
- **Next.js:** App Router only, no `pages/` dir, TypeScript strict mode on.
- **README.md:** include setup for both apps — env files, getting the Supabase connection
  string (Settings → Database → direct URI, not the pooler), starting a tunnel for
  `PUBLIC_BASE_URL`, running backend (`go run .`) and frontend (`npm run dev`), and a note
  that `./uploads` should be cleared periodically.

---

## Out of Scope for This Build
- The PC polling script (separate task)
- Admin dashboard, multi-machine UI
- SMS/email notifications
- Authentication / login
- Production SSLCommerz (sandbox only)
- Upload cleanup automation, image compression
