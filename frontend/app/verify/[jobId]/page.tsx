"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { Button, FieldLabel, Icon } from "@/components/ui";
import { TK } from "@/lib/theme";

// Demo OTP — the design's "shop notifies you" step. Purely client-side: there
// is no SMS backend, so any number works and the code is fixed to 1234.
const DEMO_CODE = "1234";

function VerifyInner() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const machine = useSearchParams().get("machine");
  const qs = machine ? `?machine=${encodeURIComponent(machine)}` : "";

  const [phase, setPhase] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [seconds, setSeconds] = useState(28);
  const [err, setErr] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (phase !== "otp") return;
    setSeconds(28);
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const valid = phone.replace(/\D/g, "").length >= 10;
  const sendOtp = () => {
    setPhase("otp");
    setTimeout(() => inputs.current[0]?.focus(), 60);
  };

  const setDigit = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    setErr(false);
    if (v && i < 3) inputs.current[i + 1]?.focus();
    if (next.every((d) => d)) {
      const code = next.join("");
      setTimeout(() => {
        if (code === DEMO_CODE) router.push(`/pay/${jobId}${qs}`);
        else setErr(true);
      }, 200);
    }
  };
  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  return (
    <AppShell step={3} onBack={() => router.back()}>
      <div className="pg-fade" style={{ padding: "10px 22px 0", display: "flex", flexDirection: "column", minHeight: "100%" }}>
        {/* phone + lock badge icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: TK.accentTint,
            display: "grid",
            placeItems: "center",
            margin: "8px 0 22px",
            flexShrink: 0,
          }}
        >
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <rect x="7" y="2" width="16" height="26" rx="3.5" stroke={TK.accent} strokeWidth="2" fill="none" />
            <rect x="9.5" y="5" width="11" height="16" rx="1.5" fill={TK.accent} fillOpacity="0.15" />
            <rect x="13" y="24" width="4" height="1.5" rx="0.75" fill={TK.accent} fillOpacity="0.5" />
            <circle cx="12.5" cy="13" r="1.2" fill={TK.accent} />
            <circle cx="15" cy="13" r="1.2" fill={TK.accent} />
            <circle cx="17.5" cy="13" r="1.2" fill={TK.accent} />
            <circle cx="25" cy="26" r="7" fill={TK.accentTint} stroke={TK.accent} strokeWidth="1.5" />
            <rect x="22.2" y="25.2" width="5.6" height="4.2" rx="1" fill={TK.accent} />
            <path d="M23.4 25.2v-1.5a1.6 1.6 0 013.2 0v1.5" stroke={TK.accent} strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <circle cx="25" cy="27" r="0.8" fill="white" />
          </svg>
        </div>

        {phase === "phone" ? (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: TK.ink, letterSpacing: "-.025em", margin: "0 0 8px" }}>
              Verify your mobile
            </h1>
            <p style={{ fontSize: 14.5, color: TK.muted, margin: "0 0 26px", lineHeight: 1.5 }}>
              We&apos;ll text a 4-digit code so the shop can notify you the moment your prints are ready.
            </p>
            <FieldLabel>Mobile number</FieldLabel>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: `1.5px solid ${TK.line}`,
                borderRadius: TK.radius,
                background: TK.card,
                overflow: "hidden",
                height: 56,
              }}
            >
              <span
                style={{
                  padding: "0 14px",
                  fontWeight: 700,
                  color: TK.ink,
                  fontSize: 16,
                  borderRight: `1px solid ${TK.line}`,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  background: TK.surface,
                }}
              >
                +880
              </span>
              <input
                className="pg-input"
                inputMode="numeric"
                placeholder="1XXX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, "").slice(0, 13))}
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  height: "100%",
                  padding: "0 14px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: TK.ink,
                  letterSpacing: ".04em",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <Button variant="primary" size="md" disabled={!valid} onClick={sendOtp}>
                Send code
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: TK.ink, letterSpacing: "-.025em", margin: "0 0 8px" }}>
              Enter the code
            </h1>
            <p style={{ fontSize: 14.5, color: TK.muted, margin: "0 0 8px", lineHeight: 1.5 }}>
              Sent to <b style={{ color: TK.ink }}>+880 {phone}</b>.{" "}
              <button
                onClick={() => setPhase("phone")}
                style={{ border: "none", background: "none", color: TK.accent, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, padding: 0 }}
              >
                Change
              </button>
            </p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 12px",
                background: TK.accentTint,
                borderRadius: 100,
                alignSelf: "flex-start",
                margin: "6px 0 26px",
              }}
            >
              <Icon name="spark" size={15} color={TK.accentDark} />
              <span style={{ fontSize: 12.5, color: TK.accentDark, fontWeight: 700, letterSpacing: ".01em" }}>
                Demo code: 1234
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  className="pg-otp"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => onKey(i, e)}
                  style={{
                    width: 60,
                    height: 70,
                    textAlign: "center",
                    fontSize: 30,
                    fontWeight: 800,
                    color: TK.ink,
                    border: `2px solid ${err ? TK.danger : d ? TK.accent : TK.line}`,
                    borderRadius: TK.radius,
                    background: TK.card,
                    caretColor: TK.accent,
                    transition: "border-color .15s",
                  }}
                />
              ))}
            </div>
            {err && (
              <p className="pg-rise" style={{ color: TK.danger, fontSize: 13.5, fontWeight: 600, textAlign: "center", marginTop: 14 }}>
                That code didn&apos;t match. Try 1234.
              </p>
            )}
            <div style={{ textAlign: "center", marginTop: 22, fontSize: 13.5, color: TK.muted }}>
              {seconds > 0 ? (
                <>
                  Resend code in{" "}
                  <b style={{ color: TK.ink, fontVariantNumeric: "tabular-nums" }}>0:{String(seconds).padStart(2, "0")}</b>
                </>
              ) : (
                <button
                  onClick={() => setSeconds(28)}
                  style={{ border: "none", background: "none", color: TK.accent, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5 }}
                >
                  Resend code
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<AppShell showRail={false}><div style={{ padding: 40 }} /></AppShell>}>
      <VerifyInner />
    </Suspense>
  );
}
