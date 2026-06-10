"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell, PriceBar } from "@/components/Shell";
import { PrintConfigForm, type LocalConfig } from "@/components/PrintConfigForm";
import { Icon } from "@/components/ui";
import { TK, taka } from "@/lib/theme";
import { getJob, updateConfig, ApiError, type Job, type JobConfig } from "@/lib/api";

// Per-page display rates (the backend price is authoritative; these only label
// the color cards). Mirror the backend defaults.
const BW_RATE = 2;
const COLOR_RATE = 5;

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
    customPages: custom ? (job.page_range_to as number) : job.page_count,
  };
}

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

  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the job.
  useEffect(() => {
    let alive = true;
    getJob(jobId)
      .then((j) => {
        if (!alive) return;
        setJob(j);
        setCfg(fromJob(j));
        setPrice(j.price_taka);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Could not load your job."),
      );
    return () => {
      alive = false;
    };
  }, [jobId]);

  // Debounced config sync. Skips the initial hydrate.
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

  const goPay = () =>
    router.push(`/pay/${jobId}${machine ? `?machine=${encodeURIComponent(machine)}` : ""}`);

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
      <AppShell step={1} showRail>
        <div style={{ padding: 40, textAlign: "center", color: TK.muted, fontSize: 14 }}>
          Loading your document…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      step={1}
      onBack={() => router.back()}
      footer={<PriceBar price={price} onNext={goPay} disabled={saving} />}
    >
      <div className="pg-fade" style={{ padding: "6px 18px 0" }}>
        <h1
          style={{
            fontSize: 23,
            fontWeight: 800,
            color: TK.ink,
            letterSpacing: "-.025em",
            margin: "4px 0 18px",
          }}
        >
          Print settings
        </h1>

        {/* file summary */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: TK.card,
            border: `1px solid ${TK.line}`,
            borderRadius: TK.radius,
            padding: "13px 16px",
            marginBottom: 22,
          }}
        >
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
            <Icon name="doc1" size={20} color={TK.accentDark} />
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
              {job.original_filename}
            </div>
            <div style={{ fontSize: 12, color: TK.muted }}>
              {job.page_count} page{job.page_count > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <PrintConfigForm
          cfg={cfg}
          pageCount={job.page_count}
          bwRate={BW_RATE}
          colorRate={COLOR_RATE}
          onChange={patch}
        />

        {/* live price line */}
        <div
          style={{
            background: TK.card,
            border: `1px solid ${TK.line}`,
            borderRadius: TK.radius,
            padding: "14px 16px",
            margin: "4px 0 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: TK.inkSoft }}>Estimated total</span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: TK.accent,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {taka(price)}
          </span>
        </div>

        {saveError && (
          <p style={{ color: TK.danger, fontSize: 13, fontWeight: 600, margin: "0 0 14px" }}>
            {saveError}
          </p>
        )}
      </div>
    </AppShell>
  );
}
