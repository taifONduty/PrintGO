"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell, PriceBar } from "@/components/Shell";
import { Icon, Row, SectionHead } from "@/components/ui";
import { TK, rgba, taka } from "@/lib/theme";
import { getJob, initPayment, ApiError, type Job } from "@/lib/api";

function PayInner() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const machine = params.get("machine");
  const failed = params.get("failed") === "true";
  const cancelled = params.get("cancelled") === "true";

  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let alive = true;
    getJob(jobId)
      .then((j) => alive && setJob(j))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load your order."),
      );
    return () => {
      alive = false;
    };
  }, [jobId]);

  const pay = async () => {
    setPaying(true);
    setError(null);
    try {
      const { gateway_url } = await initPayment(jobId);
      window.location.href = gateway_url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start payment.");
      setPaying(false);
    }
  };

  if (error && !job) {
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
      <AppShell step={2} showRail>
        <div style={{ padding: 40, textAlign: "center", color: TK.muted, fontSize: 14 }}>
          Loading your order…
        </div>
      </AppShell>
    );
  }

  const banner = failed
    ? { msg: "Payment failed. No charge was made — please try again.", show: true }
    : cancelled
      ? { msg: "Payment cancelled. Your order is still here when you're ready.", show: true }
      : { msg: "", show: false };

  const specs: [string, string][] = [
    ["Copies", `${job.copies}`],
    ["Color", job.color ? "Color" : "Black & White"],
    ["Sides", job.duplex ? "Double-sided" : "Single-sided"],
    [
      "Pages",
      job.page_range_from && job.page_range_to
        ? `${job.page_range_from}–${job.page_range_to} of ${job.page_count}`
        : `All ${job.page_count}`,
    ],
  ];

  return (
    <AppShell
      step={2}
      onBack={() => router.back()}
      footer={
        <PriceBar
          price={job.price_taka}
          sub="Amount due"
          label={paying ? "Connecting…" : `Pay ${taka(job.price_taka)}`}
          onNext={pay}
          disabled={paying}
        />
      }
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
          Review &amp; pay
        </h1>

        {banner.show && (
          <div
            className="pg-rise"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: rgba(failed ? TK.danger : TK.accent, 0.1),
              borderRadius: TK.radius,
              padding: "12px 16px",
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontSize: 13.5,
                color: failed ? TK.danger : TK.accentDark,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {banner.msg}
            </span>
          </div>
        )}

        {/* document */}
        <SectionHead title="Document" />
        <div
          style={{
            background: TK.card,
            border: `1px solid ${TK.line}`,
            borderRadius: TK.radius,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}>
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
              <Icon name="doc1" size={19} color={TK.accentDark} />
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
        </div>

        {/* options */}
        <SectionHead title="Print options" action="Edit" onAction={() => router.back()} />
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

        {/* total */}
        <SectionHead title="Payment summary" />
        <div
          style={{
            background: TK.card,
            border: `1px solid ${TK.line}`,
            borderRadius: TK.radius,
            padding: "4px 16px 12px",
            marginBottom: 20,
          }}
        >
          <Row k="Subtotal" v={taka(job.price_taka)} />
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
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: TK.accent,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {taka(job.price_taka)}
            </span>
          </div>
        </div>

        {/* gateway note */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            color: TK.muted,
            fontSize: 12.5,
            marginBottom: 18,
          }}
        >
          <Icon name="lock" size={15} color={TK.muted} stroke={2} />
          <span>Secured by SSLCommerz · bKash, Nagad &amp; cards</span>
        </div>

        {error && (
          <p
            style={{
              color: TK.danger,
              fontSize: 13,
              fontWeight: 600,
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            {error}
          </p>
        )}
      </div>
    </AppShell>
  );
}

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <AppShell showRail={false}>
          <div style={{ padding: 40 }} />
        </AppShell>
      }
    >
      <PayInner />
    </Suspense>
  );
}
