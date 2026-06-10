"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { TK, rgba } from "@/lib/theme";
import { Icon, Spinner, Button } from "@/components/ui";
import { getStatus, type JobStatus } from "@/lib/api";

const POLL_MS = 3000;

// The four visible stages and the job statuses that activate each.
const STAGES = [
  { label: "Payment confirmed", at: ["paid", "queued", "printing", "completed"] },
  { label: "Sent to printer", at: ["queued", "printing", "completed"] },
  { label: "Printing your pages", at: ["printing", "completed"] },
  { label: "Ready for pickup", at: ["completed"] },
] as const;

function activeStage(status: JobStatus): number {
  let idx = 0;
  STAGES.forEach((s, i) => {
    if ((s.at as readonly string[]).includes(status)) idx = i;
  });
  if (status === "pending_payment") return -1;
  return idx;
}

export function StatusPoller({ jobId, onReset }: { jobId: string; onReset: () => void }) {
  const [status, setStatus] = useState<JobStatus>("pending_payment");
  const [message, setMessage] = useState("Waiting for payment confirmation...");
  const stopped = useRef(false);
  const token = useMemo(() => "PG-" + Math.floor(1000 + Math.random() * 8999), []);

  useEffect(() => {
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const res = await getStatus(jobId);
        if (stopped.current) return;
        setStatus(res.status);
        setMessage(res.message);
        if (res.status === "completed" || res.status === "failed") return; // terminal
      } catch {
        // transient error — keep polling
      }
      if (!stopped.current) timer = setTimeout(tick, POLL_MS);
    };

    tick();
    return () => {
      stopped.current = true;
      clearTimeout(timer);
    };
  }, [jobId]);

  const done = status === "completed";
  const failed = status === "failed";
  const active = activeStage(status);

  if (failed) {
    return (
      <div
        className="pg-fade"
        style={{ padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: "50%",
            background: rgba(TK.danger, 0.12),
            display: "grid",
            placeItems: "center",
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 44, color: TK.danger, fontWeight: 800, lineHeight: 1 }}>!</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: TK.ink, margin: "0 0 6px" }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14.5, color: TK.muted, margin: "0 0 24px", lineHeight: 1.5, maxWidth: 280 }}>
          {message}
        </p>
        <Button variant="dark" size="md" onClick={onReset} icon="printer">
          Start a new print
        </Button>
      </div>
    );
  }

  return (
    <div
      className="pg-fade"
      style={{ padding: "20px 22px 24px", minHeight: "100%", display: "flex", flexDirection: "column" }}
    >
      {/* hero */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          marginBottom: 26,
        }}
      >
        {done ? (
          <div
            className="pg-pop"
            style={{
              width: 92,
              height: 92,
              borderRadius: "50%",
              background: TK.ok,
              display: "grid",
              placeItems: "center",
              boxShadow: `0 14px 34px ${rgba(TK.ok, 0.4)}`,
              marginBottom: 20,
            }}
          >
            <Icon name="check" size={48} color="#fff" stroke={3} />
          </div>
        ) : (
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: "50%",
              background: TK.accentTint,
              display: "grid",
              placeItems: "center",
              marginBottom: 20,
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <Spinner size={92} />
            </div>
            <Icon
              name="printer"
              size={38}
              color={TK.accent}
              stroke={2}
              style={{ animation: "pgBob 1.6s ease-in-out infinite" }}
            />
          </div>
        )}
        <h1 style={{ fontSize: 24, fontWeight: 800, color: TK.ink, letterSpacing: "-.025em", margin: "0 0 6px" }}>
          {done ? "Your prints are ready!" : "Printing in progress"}
        </h1>
        <p style={{ fontSize: 14.5, color: TK.muted, margin: 0, lineHeight: 1.5, maxWidth: 280 }}>
          {done ? "Show the pickup token to collect your documents." : message}
        </p>
      </div>

      {/* pickup token */}
      <div
        style={{
          background: done ? TK.ink : TK.card,
          color: done ? "#fff" : TK.ink,
          border: `1px solid ${done ? TK.ink : TK.line}`,
          borderRadius: TK.radiusLg,
          padding: "20px 22px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginBottom: 22,
          transition: "all .4s",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: done ? rgba("#fff", 0.6) : TK.muted,
              marginBottom: 4,
            }}
          >
            Pickup token
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: ".02em", fontVariantNumeric: "tabular-nums" }}>
            {token}
          </div>
        </div>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: "#fff",
            display: "grid",
            placeItems: "center",
            padding: 8,
            flexShrink: 0,
          }}
        >
          <Icon name="qr" size={48} color={TK.ink} stroke={1.6} />
        </div>
      </div>

      {/* stage list */}
      <div
        style={{
          background: TK.card,
          border: `1px solid ${TK.line}`,
          borderRadius: TK.radius,
          padding: "6px 18px",
          marginBottom: 22,
        }}
      >
        {STAGES.map((s, i) => {
          const sdone = i < active || done;
          const scur = i === active && !done;
          return (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "11px 0",
                borderTop: i ? `1px solid ${TK.lineSoft}` : "none",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: sdone ? TK.ok : scur ? TK.accent : TK.surface,
                  border: sdone || scur ? "none" : `2px solid ${TK.line}`,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {sdone ? (
                  <Icon name="check" size={13} color="#fff" stroke={3} />
                ) : scur ? (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#fff",
                      animation: "pgBlink 1s infinite",
                    }}
                  />
                ) : null}
              </span>
              <span
                style={{
                  fontSize: 14.5,
                  fontWeight: scur ? 700 : 600,
                  color: sdone || scur ? TK.ink : TK.faint,
                  flex: 1,
                }}
              >
                {s.label}
              </span>
              {scur && <span style={{ fontSize: 12, color: TK.accent, fontWeight: 700 }}>now</span>}
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />
      {done && (
        <div className="pg-rise" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="dark" size="md" onClick={onReset} icon="printer">
            Start a new print
          </Button>
        </div>
      )}
    </div>
  );
}
