"use client";

import React, { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell, PriceBar } from "@/components/Shell";
import { FileDropzone } from "@/components/FileDropzone";
import { PreviewOverlay } from "@/components/PreviewOverlay";
import { Icon, PagePreview, AddMoreTile } from "@/components/ui";
import { TK, rgba } from "@/lib/theme";
import { uploadFile, addFile, removeFile, ApiError, type Job, type FileItem } from "@/lib/api";

function UploadInner() {
  const router = useRouter();
  const params = useSearchParams();
  const machine = params.get("machine");

  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  // No machine in the QR URL → block upload entirely.
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

  // Upload a batch of files sequentially: the first creates the job, the rest
  // are appended to it.
  const addFiles = async (files: File[]) => {
    setError(null);
    setBusy(true);
    let current = job;
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setBusyLabel(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : "Uploading…");
        current = current ? await addFile(current.id, f) : await uploadFile(f, machine);
        setJob(current);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  const onRemove = async (fileId: string) => {
    if (!job) return;
    setError(null);
    try {
      setJob(await removeFile(job.id, fileId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove the file.");
    }
  };

  const goConfigure = () => router.push(`/configure/${job!.id}?machine=${encodeURIComponent(machine)}`);

  const files = job?.files ?? [];
  const empty = files.length === 0;

  return (
    <AppShell
      step={0}
      footer={
        !empty ? (
          <PriceBar price={job!.price_taka} label="Configure print" sub="From" onNext={goConfigure} disabled={busy} />
        ) : null
      }
      overlay={<PreviewOverlay file={preview} onClose={() => setPreview(null)} />}
    >
      {/* hidden input for "Add more" */}
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
        <h1
          style={{
            fontSize: 25,
            fontWeight: 800,
            color: TK.ink,
            letterSpacing: "-.025em",
            margin: "4px 0 4px",
          }}
        >
          What are we printing?
        </h1>
        <p style={{ fontSize: 14.5, color: TK.muted, margin: "0 0 20px", lineHeight: 1.45 }}>
          Drop in PDFs, docs or images. We&apos;ll handle the rest.
        </p>

        {empty ? (
          <FileDropzone onFiles={addFiles} disabled={busy} />
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
                onDelete={() => onRemove(f.id)}
                onExpand={() => setPreview(f)}
              />
            ))}
            <AddMoreTile onClick={() => addInputRef.current?.click()} />
          </div>
        )}

        {!empty && (
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
            {busy && <Spinner />}
            <span style={{ fontSize: 13.5, color: TK.accentDark, fontWeight: 600, lineHeight: 1.4 }}>
              {busy
                ? busyLabel
                : `${files.length} file${files.length > 1 ? "s" : ""} · ${job!.page_count} page${
                    job!.page_count > 1 ? "s" : ""
                  } ready to configure`}
            </span>
          </div>
        )}

        {error && (
          <div
            className="pg-rise"
            style={{
              marginTop: 16,
              background: rgba(TK.danger, 0.08),
              borderRadius: TK.radius,
              padding: "12px 16px",
            }}
          >
            <span style={{ fontSize: 13.5, color: TK.danger, fontWeight: 600 }}>{error}</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Spinner() {
  return (
    <span
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `2px solid ${rgba(TK.accentDark, 0.3)}`,
        borderTopColor: TK.accentDark,
        display: "inline-block",
        animation: "pgSpin .8s linear infinite",
        flexShrink: 0,
      }}
    />
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
