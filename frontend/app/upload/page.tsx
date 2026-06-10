"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell, PriceBar } from "@/components/Shell";
import { FileDropzone } from "@/components/FileDropzone";
import { PreviewOverlay } from "@/components/PreviewOverlay";
import { Icon, PagePreview, AddMoreTile } from "@/components/ui";
import { TK, rgba } from "@/lib/theme";
import {
  uploadFile,
  addFile,
  removeFile,
  getJob,
  filePageUrl,
  ApiError,
  type Job,
  type FileItem,
} from "@/lib/api";

interface Pending {
  key: string;
  name: string;
}

function UploadInner() {
  const router = useRouter();
  const params = useSearchParams();
  const machine = params.get("machine");
  const storageKey = machine ? `pg_job_${machine}` : null;

  const [job, setJob] = useState<Job | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const counter = useRef(0);

  // Restore an in-progress job (still "created") across refresh / back-nav.
  useEffect(() => {
    if (!storageKey) {
      setRestoring(false);
      return;
    }
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) {
      setRestoring(false);
      return;
    }
    let alive = true;
    getJob(stored)
      .then((j) => {
        if (!alive) return;
        if (j.status === "created") setJob(j);
        else sessionStorage.removeItem(storageKey);
      })
      .catch(() => sessionStorage.removeItem(storageKey))
      .finally(() => alive && setRestoring(false));
    return () => {
      alive = false;
    };
  }, [storageKey]);

  if (!machine) {
    return (
      <AppShell showRail={false}>
        <div className="pg-fade" style={{ padding: "40px 24px", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: rgba(TK.danger, 0.12),
              display: "grid",
              placeItems: "center",
              margin: "12px auto 20px",
            }}
          >
            <Icon name="printer" size={30} color={TK.danger} stroke={2} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: TK.ink, margin: "0 0 8px" }}>Invalid QR code</h1>
          <p style={{ fontSize: 14.5, color: TK.muted, lineHeight: 1.5, margin: 0 }}>
            We couldn&apos;t tell which printer you&apos;re at. Please rescan the QR code on the machine.
          </p>
        </div>
      </AppShell>
    );
  }

  // Upload a batch sequentially. Cards for each file appear immediately as
  // "processing" placeholders, then become real once the server responds.
  const addFiles = async (selected: File[]) => {
    setError(null);
    const entries: Pending[] = selected.map((f) => ({ key: `p${counter.current++}`, name: f.name }));
    setPending((p) => [...p, ...entries]);

    let current = job;
    for (let i = 0; i < selected.length; i++) {
      try {
        current = current ? await addFile(current.id, selected[i]) : await uploadFile(selected[i], machine);
        setJob(current);
        if (storageKey) sessionStorage.setItem(storageKey, current.id);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
      } finally {
        setPending((p) => p.filter((e) => e.key !== entries[i].key));
      }
    }
  };

  const onRemove = async (fileId: string) => {
    if (!job) return;
    setError(null);
    try {
      const updated = await removeFile(job.id, fileId);
      setJob(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove the file.");
    }
  };

  const goConfigure = () => router.push(`/configure/${job!.id}?machine=${encodeURIComponent(machine)}`);

  const files = job?.files ?? [];
  const busy = pending.length > 0;
  const empty = files.length === 0 && pending.length === 0;

  if (restoring) {
    return (
      <AppShell step={0}>
        <div style={{ padding: 40, textAlign: "center", color: TK.muted, fontSize: 14 }}>Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      step={0}
      footer={
        files.length > 0 || busy ? (
          <PriceBar
            price={job?.price_taka ?? "0.00"}
            label={busy ? "Uploading…" : "Configure print"}
            sub="From"
            onNext={goConfigure}
            disabled={busy || files.length === 0}
          />
        ) : null
      }
      overlay={<PreviewOverlay file={preview} onClose={() => setPreview(null)} />}
    >
      <input
        ref={addInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png"
        style={{ display: "none" }}
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? []);
          if (fs.length) addFiles(fs);
          e.target.value = "";
        }}
      />

      <div className="pg-fade" style={{ padding: "6px 18px 18px" }}>
        <h1 style={{ fontSize: 25, fontWeight: 800, color: TK.ink, letterSpacing: "-.025em", margin: "4px 0 4px" }}>
          What are we printing?
        </h1>
        <p style={{ fontSize: 14.5, color: TK.muted, margin: "0 0 20px", lineHeight: 1.45 }}>
          Drop in PDFs, docs or images. We&apos;ll handle the rest.
        </p>

        {empty ? (
          <FileDropzone onFiles={addFiles} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
              gap: 14,
              alignItems: "start",
            }}
          >
            {files.map((f) => (
              <PagePreview
                key={f.id}
                name={f.original_filename}
                pages={f.page_count}
                kind={f.kind}
                previewSrc={filePageUrl(f.job_id, f.id, 1)}
                onDelete={() => onRemove(f.id)}
                onExpand={() => setPreview(f)}
              />
            ))}
            {pending.map((p) => (
              <PagePreview key={p.key} name={p.name} pages={1} kind="doc" processing />
            ))}
            <AddMoreTile onClick={() => addInputRef.current?.click()} />
          </div>
        )}

        {!empty && job && (
          <div
            className="pg-rise"
            style={{
              marginTop: 22,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: TK.accentTint,
              borderRadius: TK.radius,
              padding: "12px 16px",
            }}
          >
            <Icon name="spark" size={20} color={TK.accentDark} />
            <span style={{ fontSize: 13.5, color: TK.accentDark, fontWeight: 600, lineHeight: 1.4 }}>
              {busy
                ? "Adding your files…"
                : `${files.length} file${files.length > 1 ? "s" : ""} · ${job.page_count} page${
                    job.page_count > 1 ? "s" : ""
                  } ready to configure`}
            </span>
          </div>
        )}

        {error && (
          <div
            className="pg-rise"
            style={{ marginTop: 16, background: rgba(TK.danger, 0.08), borderRadius: TK.radius, padding: "12px 16px" }}
          >
            <span style={{ fontSize: 13.5, color: TK.danger, fontWeight: 600 }}>{error}</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <AppShell showRail={false}>
          <div style={{ padding: 40 }} />
        </AppShell>
      }
    >
      <UploadInner />
    </Suspense>
  );
}
