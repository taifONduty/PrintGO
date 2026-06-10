CREATE TABLE IF NOT EXISTS machines (
    id          TEXT PRIMARY KEY,        -- e.g. "VM001"
    name        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'online',
    last_seen   TIMESTAMPTZ
);

INSERT INTO machines (id, name) VALUES ('VM001', 'Prototype Printer')
ON CONFLICT DO NOTHING;

-- A job is one print order. Files belong to it (one row per uploaded document).
CREATE TABLE IF NOT EXISTS jobs (
    id                UUID PRIMARY KEY,   -- generated app-side, see upload flow
    machine_id        TEXT NOT NULL REFERENCES machines(id),
    page_count        INT NOT NULL DEFAULT 0,  -- aggregate page count across files
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

-- Per-file rows. file_path is the absolute path to the PRINT-READY PDF.
CREATE TABLE IF NOT EXISTS files (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    file_path         TEXT NOT NULL,      -- print-ready PDF
    file_mime         TEXT NOT NULL,      -- mime of the original upload
    page_count        INT NOT NULL,
    kind              TEXT NOT NULL DEFAULT 'doc',  -- doc | img
    sort_order        INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS files_job_id_idx ON files (job_id);

-- Migration for databases created under the old single-file schema: the
-- per-file columns now live on the files table.
ALTER TABLE jobs DROP COLUMN IF EXISTS original_filename;
ALTER TABLE jobs DROP COLUMN IF EXISTS file_path;
ALTER TABLE jobs DROP COLUMN IF EXISTS file_mime;
ALTER TABLE jobs ALTER COLUMN page_count SET DEFAULT 0;

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
