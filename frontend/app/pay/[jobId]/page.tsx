"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell, PriceBar } from "@/components/Shell";
import { Icon } from "@/components/ui";
import { TK, rgba, taka } from "@/lib/theme";
import { getJob, initPayment, ApiError, type Job } from "@/lib/api";

const METHODS = [
  { id: "bkash", name: "bKash", tag: "Mobile wallet", c: "#E2136E" },
  { id: "nagad", name: "Nagad", tag: "Mobile wallet", c: "#EE7621" },
  { id: "card", name: "Debit / Credit card", tag: "Visa · Mastercard", c: TK.ink },
];

function PayInner() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const failed = params.get("failed") === "true";
  const cancelled = params.get("cancelled") === "true";

  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [sel, setSel] = useState("bkash");

  useEffect(() => {
    let alive = true;
    getJob(jobId)
      .then((j) => alive && setJob(j))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load your order."));
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
      <AppShell step={4}>
        <div style={{ padding: 40, textAlign: "center", color: TK.muted, fontSize: 14 }}>Loading your order…</div>
      </AppShell>
    );
  }

  const banner = failed
    ? { msg: "Payment failed. No charge was made — please try again.", danger: true }
    : cancelled
      ? { msg: "Payment cancelled. Your order is still here when you're ready.", danger: false }
      : null;

  return (
    <AppShell
      step={4}
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
        <h1 style={{ fontSize: 23, fontWeight: 800, color: TK.ink, letterSpacing: "-.025em", margin: "4px 0 4px" }}>
          Choose payment
        </h1>
        <p style={{ fontSize: 14, color: TK.muted, margin: "0 0 22px" }}>
          Secured by SSLCommerz. You&apos;ll pick the exact method on the gateway.
        </p>

        {banner && (
          <div
            className="pg-rise"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: rgba(banner.danger ? TK.danger : TK.accent, 0.1),
              borderRadius: TK.radius,
              padding: "12px 16px",
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 13.5, color: banner.danger ? TK.danger : TK.accentDark, fontWeight: 600, lineHeight: 1.4 }}>
              {banner.msg}
            </span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
          {METHODS.map((m) => {
            const on = sel === m.id;
            return (
              <button
                key={m.id}
                className="pg-tile pg-press"
                onClick={() => setSel(m.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "15px 16px",
                  background: on ? TK.accentTint : TK.card,
                  border: `1.5px solid ${on ? TK.accent : TK.line}`,
                  borderRadius: TK.radius,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: m.c,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 17,
                  }}
                >
                  {m.id === "card" ? <Icon name="lock" size={20} color="#fff" stroke={2} /> : m.name[0]}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15.5, color: TK.ink }}>{m.name}</div>
                  <div style={{ fontSize: 12.5, color: TK.muted }}>{m.tag}</div>
                </div>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: on ? "none" : `2px solid ${TK.line}`,
                    background: on ? TK.accent : "transparent",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {on && <Icon name="check" size={13} color="#fff" stroke={3} />}
                </span>
              </button>
            );
          })}
        </div>

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
          <span>256-bit encrypted · PCI-DSS compliant</span>
        </div>

        {error && (
          <p style={{ color: TK.danger, fontSize: 13, fontWeight: 600, textAlign: "center", marginBottom: 14 }}>{error}</p>
        )}
      </div>
    </AppShell>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<AppShell showRail={false}><div style={{ padding: 40 }} /></AppShell>}>
      <PayInner />
    </Suspense>
  );
}
