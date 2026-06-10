"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell, PriceBar } from "@/components/Shell";
import { PrintConfigForm, type LocalConfig } from "@/components/PrintConfigForm";
import { PreviewOverlay } from "@/components/PreviewOverlay";
import { MiniDoc, Row } from "@/components/ui";
import { TK, RATES } from "@/lib/theme";
import { getJob, updateConfig, fileContentUrl, ApiError, type Job, type JobConfig, type FileItem } from "@/lib/api";

function toApiConfig(cfg: LocalConfig): JobConfig {
  const custom = cfg.range === "custom";
  return {
    color: cfg.color,
    copies: cfg.copies,
    duplex: cfg.duplex,
    page_range_from: custom ? 1 : null,
    page_range_to: custom ? cfg.customPages : null,
  };
}

function fromJob(job: Job): LocalConfig {
  const custom = job.page_range_from != null && job.page_range_to != null;
  return {
    color: job.color,
    copies: job.copies,
    duplex: job.duplex,
    range: custom ? "custom" : "all",
    customPages: custom ? (job.page_range_to as number) : Math.max(1, job.page_count),
  };
}

const moneyN = (n: number) => "৳" + n;

export default function ConfigurePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const machine = useSearchParams().get("machine");

  const [job, setJob] = useState<Job | null>(null);
  const [cfg, setCfg] = useState<LocalConfig | null>(null);
  const [price, setPrice] = useState("0.00");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<FileItem | null>(null);

  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    getJob(jobId)
      .then((j) => {
        if (!alive) return;
        setJob(j);
        setCfg(fromJob(j));
        setPrice(j.price_taka);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load your job."));
    return () => {
      alive = false;
    };
  }, [jobId]);

  useEffect(() => {
    if (!cfg || !dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    setSaving(true);
    timer.current = setTimeout(async () => {
      try {
        const updated = await updateConfig(jobId, toApiConfig(cfg));
        setJob(updated);
        setPrice(updated.price_taka);
        setSaveError(null);
      } catch (err) {
        setSaveError(err instanceof ApiError ? err.message : "Could not update settings.");
      } finally {
        setSaving(false);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [cfg, jobId]);

  const patch = useCallback((p: Partial<LocalConfig>) => {
    dirty.current = true;
    setCfg((prev) => (prev ? { ...prev, ...p } : prev));
  }, []);

  const goReview = () =>
    router.push(`/review/${jobId}${machine ? `?machine=${encodeURIComponent(machine)}` : ""}`);

  if (loadError) {
    return (
      <AppShell showRail={false} onBack={() => router.back()}>
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14.5, color: TK.danger, fontWeight: 600 }}>{loadError}</p>
        </div>
      </AppShell>
    );
  }

  if (!job || !cfg) {
    return (
      <AppShell step={1}>
        <div style={{ padding: 40, textAlign: "center", color: TK.muted, fontSize: 14 }}>Loading your documents…</div>
      </AppShell>
    );
  }

  // Live breakdown (display only; the bar total comes from the backend).
  const totalPages = job.page_count;
  const range = cfg.range === "custom" ? Math.min(cfg.customPages, totalPages) : totalPages;
  const perPage = cfg.color ? RATES.color : RATES.bw;
  const sheets = cfg.duplex ? Math.ceil(range / 2) : range;
  const subtotal = range * perPage * cfg.copies;
  const serviceFee = job.files.length ? RATES.serviceFee : 0;

  return (
    <AppShell
      step={1}
      onBack={() => router.back()}
      footer={<PriceBar price={price} onNext={goReview} disabled={saving} />}
      overlay={<PreviewOverlay file={preview} onClose={() => setPreview(null)} />}
    >
      <div className="pg-fade" style={{ padding: "6px 18px 0" }}>
        <h1 style={{ fontSize: 23, fontWeight: 800, color: TK.ink, letterSpacing: "-.025em", margin: "4px 0 18px" }}>
          Print settings
        </h1>

        {/* files strip */}
        <div
          className="pg-scroll"
          style={{ display: "flex", gap: 12, overflowX: "auto", margin: "0 -18px 22px", padding: "0 18px 4px" }}
        >
          {job.files.map((f) => (
            <MiniDoc
              key={f.id}
              name={f.original_filename}
              kind={f.kind}
              previewSrc={fileContentUrl(f.job_id, f.id)}
              onClick={() => setPreview(f)}
            />
          ))}
        </div>

        <PrintConfigForm cfg={cfg} pageCount={totalPages} bwRate={RATES.bw} colorRate={RATES.color} onChange={patch} />

        {/* live breakdown */}
        <div
          style={{
            background: TK.card,
            border: `1px solid ${TK.line}`,
            borderRadius: TK.radius,
            padding: "4px 16px",
            margin: "4px 0 18px",
          }}
        >
          <Row
            k={`${range} page${range > 1 ? "s" : ""} × ৳${perPage} × ${cfg.copies} cop${cfg.copies > 1 ? "ies" : "y"}`}
            v={moneyN(subtotal)}
          />
          <Row k="Service fee" v={moneyN(serviceFee)} />
          <Row k="Sheets used" v={`${sheets * cfg.copies}`} muted />
        </div>

        {saveError && (
          <p style={{ color: TK.danger, fontSize: 13, fontWeight: 600, margin: "0 0 14px" }}>{saveError}</p>
        )}
      </div>
    </AppShell>
  );
}
