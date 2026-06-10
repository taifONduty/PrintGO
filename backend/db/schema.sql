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
