"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { FileDropzone } from "@/components/FileDropzone";
import { Icon } from "@/components/ui";
import { TK, rgba } from "@/lib/theme";
import { uploadFile, ApiError } from "@/lib/api";

function UploadInner() {
  const router = useRouter();
  const params = useSearchParams();
  const machine = params.get("machine");

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: TK.ink, margin: "0 0 8px" }}>
            Invalid QR code
          </h1>
          <p style={{ fontSize: 14.5, color: TK.muted, lineHeight: 1.5, margin: 0 }}>
            We couldn&apos;t tell which printer you&apos;re at. Please rescan the QR code on the
            machine.
          </p>
        </div>
      </AppShell>
    );
  }

  const startUpload = async (f: File) => {
    setFile(f);
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadFile(f, machine, setProgress);
      router.push(`/configure/${res.job_id}?machine=${encodeURIComponent(machine)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <AppShell step={0}>
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
          Drop in a PDF, doc or image. We&apos;ll handle the rest.
        </p>

        {uploading && file ? (
          <UploadingCard name={file.name} progress={progress} />
        ) : (
          <FileDropzone onFile={startUpload} disabled={uploading} />
        )}

        {error && (
          <div
            className="pg-rise"
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: rgba(TK.danger, 0.08),
              borderRadius: TK.radius,
              padding: "12px 16px",
            }}
          >
            <span style={{ fontSize: 13.5, color: TK.danger, fontWeight: 600, lineHeight: 1.4 }}>
              {error}
            </span>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function UploadingCard({ name, progress }: { name: string; progress: number }) {
  return (
    <div
      style={{
        background: TK.card,
        border: `1px solid ${TK.line}`,
        borderRadius: TK.radius,
        padding: "20px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: TK.accentTint,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="file" size={20} color={TK.accentDark} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14.5,
              fontWeight: 600,
              color: TK.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 12, color: TK.muted }}>
            {progress < 100 ? `Uploading… ${progress}%` : "Processing document…"}
          </div>
        </div>
      </div>
      <div style={{ height: 8, borderRadius: 100, background: TK.lineSoft, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: TK.accent,
            borderRadius: 100,
            transition: "width .2s ease",
          }}
        />
      </div>
    </div>
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
