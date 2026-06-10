"use client";

import React from "react";
import { TK, rgba, KIOSK, taka } from "@/lib/theme";
import { Icon, Logo, Button } from "@/components/ui";

// ── Progress rail ───────────────────────────────────────────────────────────
// Five visible buckets: Upload → Configure → Review → Verify → Pay.
// Pass step beyond the last index (e.g. 5) on the status screen to show all done.
const RAIL = ["Upload", "Configure", "Review", "Verify", "Pay"];

export function StepRail({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 4px" }}>
      {RAIL.map((s, i) => {
        const done = i < step;
        const cur = i === step;
        return (
          <React.Fragment key={s}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: done || cur ? TK.accent : TK.card,
                  border: `1.5px solid ${done || cur ? TK.accent : TK.line}`,
                  color: done || cur ? "#fff" : TK.faint,
                  fontWeight: 700,
                  fontSize: 12,
                  transition: "all .3s",
                  boxShadow: cur ? `0 4px 10px ${rgba(TK.accent, 0.35)}` : "none",
                }}
              >
                {done ? <Icon name="check" size={14} color="#fff" stroke={3} /> : i + 1}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: cur ? 700 : 500,
                  color: cur ? TK.ink : TK.muted,
                }}
              >
                {s}
              </span>
            </div>
            {i < RAIL.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: i < step ? TK.accent : TK.line,
                  margin: "0 4px",
                  marginBottom: 16,
                  borderRadius: 2,
                  transition: "background .3s",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Sticky bottom price/action bar ────────────────────────────────────────────
export function PriceBar({
  price,
  label = "Proceed to Pay",
  onNext,
  sub,
  disabled,
}: {
  price: string;
  label?: string;
  onNext: () => void;
  sub?: string;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 18px",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        background: rgba("#FBF9F5", 0.92),
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: `1px solid ${TK.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        borderRadius: 16,
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: TK.muted, fontWeight: 600, marginBottom: 1 }}>
          {sub || "Estimated total"}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: TK.ink,
            letterSpacing: "-.02em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {taka(price)}
        </div>
      </div>
      <Button
        variant="primary"
        size="md"
        onClick={onNext}
        disabled={disabled}
        icon="arrowGo"
        style={{ flexDirection: "row-reverse", height: 44, padding: "0 20px", fontSize: 15 }}
      >
        {label}
      </Button>
    </div>
  );
}

// ── Header (kiosk chip + optional back) ───────────────────────────────────────
function AppHeader({ onBack }: { onBack?: () => void }) {
  return (
    <div style={{ padding: "0 18px", paddingTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: 52 }}>
        {onBack ? (
          <button
            className="pg-press"
            onClick={onBack}
            aria-label="Back"
            style={{
              width: 40,
              height: 40,
              marginLeft: -8,
              borderRadius: 12,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="back" size={22} color={TK.ink} stroke={2.2} />
          </button>
        ) : (
          <Logo size={19} />
        )}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "7px 12px 7px 9px",
            background: TK.card,
            border: `1px solid ${TK.line}`,
            borderRadius: 100,
            boxShadow: "0 2px 8px rgba(33,29,23,.05)",
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              background: TK.accentTint,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="printer" size={16} color={TK.accentDark} stroke={2} />
          </span>
          <div style={{ lineHeight: 1.15, maxWidth: 120 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: TK.ink,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {KIOSK.name}
            </div>
            <div
              style={{
                fontSize: 10,
                color: TK.muted,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {KIOSK.sub}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────
// Mobile-first device-width column, centered + framed on larger screens.
export function AppShell({
  step,
  onBack,
  showRail = true,
  footer,
  overlay,
  children,
}: {
  step?: number;
  onBack?: () => void;
  showRail?: boolean;
  footer?: React.ReactNode;
  overlay?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
      }}
    >
      <div className="pg-shell">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100dvh",
            background: TK.surface,
            position: "relative",
          }}
        >
          <AppHeader onBack={onBack} />
          {showRail && typeof step === "number" && (
            <div style={{ padding: "4px 18px 14px" }}>
              <StepRail step={step} />
            </div>
          )}
          <div className="pg-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {children}
          </div>
          {footer}
          {overlay}
        </div>
      </div>

      <style>{`
        .pg-shell { width: 100%; }
        @media (min-width: 480px) {
          .pg-shell {
            width: 440px;
            margin: 28px 0;
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 40px 90px rgba(33,29,23,.20), 0 0 0 1px rgba(33,29,23,.05);
          }
          .pg-shell > div { height: calc(100dvh - 56px) !important; }
        }
      `}</style>
    </div>
  );
}
