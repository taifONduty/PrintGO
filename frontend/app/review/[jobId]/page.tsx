"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell, PriceBar } from "@/components/Shell";
import { Icon, Row, SectionHead } from "@/components/ui";
import { TK, taka, RATES } from "@/lib/theme";
import { getJob, ApiError, type Job } from "@/lib/api";

function ReviewInner() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const machine = useSearchParams().get("machine");

  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getJob(jobId)
      .then((j) => alive && setJob(j))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load your order."));
    return () => {
      alive = false;
    };
  }, [jobId]);

  const qs = machine ? `?machine=${encodeURIComponent(machine)}` : "";

  if (error) {
    return (
      <AppShell showRail={false} onBack={() => router.back()}>
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14.5, color: TK.danger, fontWeight: 600 }}>{error}</p>
        </div>
      </AppShell>
    );
  }
  if (!job) {
    return (
      <AppShell step={2}>
        <div style={{ padding: 40, textAlign: "center", color: TK.muted, fontSize: 14 }}>Loading your order…</div>
      </AppShell>
    );
  }

  const totalPages = job.page_count;
  const range = job.page_range_from && job.page_range_to ? job.page_range_to - job.page_range_from + 1 : totalPages;
  const perPage = job.color ? RATES.color : RATES.bw;
  const subtotal = range * perPage * job.copies;
  const serviceFee = job.files.length ? RATES.serviceFee : 0;

  const specs: [string, string][] = [
    ["Copies", `${job.copies}`],
    ["Color", job.color ? "Color" : "Black & White"],
    ["Sides", job.duplex ? "Double-sided" : "Single-sided"],
    ["Pages", job.page_range_from && job.page_range_to ? `First ${range} of ${totalPages}` : `All ${totalPages}`],
  ];

  return (
    <AppShell
      step={2}
      onBack={() => router.back()}
      footer={
        <PriceBar
          price={job.price_taka}
          label="Confirm & verify"
          onNext={() => router.push(`/verify/${jobId}${qs}`)}
        />
      }
    >
      <div className="pg-fade" style={{ padding: "6px 18px 0" }}>
        <h1 style={{ fontSize: 23, fontWeight: 800, color: TK.ink, letterSpacing: "-.025em", margin: "4px 0 18px" }}>
          Review your order
        </h1>

        {/* documents */}
        <SectionHead title={`Documents (${job.files.length})`} action="Edit" onAction={() => router.push(`/configure/${jobId}${qs}`)} />
        <div
          style={{
            background: TK.card,
            border: `1px solid ${TK.line}`,
            borderRadius: TK.radius,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          {job.files.map((f, i) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 16px",
                borderTop: i ? `1px solid ${TK.lineSoft}` : "none",
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: TK.accentTint,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name={f.kind === "img" ? "file" : "doc1"} size={19} color={TK.accentDark} />
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
                  {f.original_filename}
                </div>
                <div style={{ fontSize: 12, color: TK.muted }}>
                  {f.page_count} page{f.page_count > 1 ? "s" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* print options */}
        <SectionHead title="Print options" action="Edit" onAction={() => router.push(`/configure/${jobId}${qs}`)} />
        <div
          style={{
            background: TK.card,
            border: `1px solid ${TK.line}`,
            borderRadius: TK.radius,
            padding: "4px 16px",
            marginBottom: 20,
          }}
        >
          {specs.map(([k, v]) => (
            <Row key={k} k={k} v={v} />
          ))}
        </div>

        {/* payment summary */}
        <SectionHead title="Payment summary" />
        <div
          style={{
            background: TK.card,
            border: `1px solid ${TK.line}`,
            borderRadius: TK.radius,
            padding: "4px 16px 12px",
            marginBottom: 18,
          }}
        >
          <Row k="Subtotal" v={"৳" + subtotal} />
          <Row k="Service fee" v={"৳" + serviceFee} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 0 12px",
              borderTop: `1px solid ${TK.line}`,
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 800, color: TK.ink }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: TK.accent, fontVariantNumeric: "tabular-nums" }}>
              {taka(job.price_taka)}
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<AppShell showRail={false}><div style={{ padding: 40 }} /></AppShell>}>
      <ReviewInner />
    </Suspense>
  );
}
