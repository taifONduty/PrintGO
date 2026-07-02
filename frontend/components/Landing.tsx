"use client";

import React from "react";
import { AppShell } from "@/components/Shell";
import { Icon, Logo } from "@/components/ui";
import { TK, rgba, KIOSK } from "@/lib/theme";

const START_HREF = "/upload?machine=VM001";

type IconName = React.ComponentProps<typeof Icon>["name"];
const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: "upload", title: "Upload your files", body: "PDFs, docs or images — drop them in." },
  { icon: "spark", title: "Configure & review", body: "Color, copies, duplex. We price it live." },
  { icon: "printer", title: "Pay & collect", body: "bKash, Nagad or card. Prints on the spot." },
];

function StepRow({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: TK.radiusSm,
          background: TK.accentTint,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name={icon} size={22} color={TK.accentDark} stroke={2.1} />
      </span>
      <div style={{ lineHeight: 1.3 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: TK.ink }}>{title}</div>
        <div style={{ fontSize: 13, color: TK.muted }}>{body}</div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <AppShell
      showRail={false}
      showHeader={false}
      footer={
        <div
          style={{
            padding: "14px 18px",
            paddingBottom: "max(14px, env(safe-area-inset-bottom))",
            background: rgba("#FBF9F5", 0.92),
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: `1px solid ${TK.line}`,
            borderRadius: 16,
          }}
        >
          <a
            href={START_HREF}
            className="pg-press"
            style={{
              height: 56,
              width: "100%",
              borderRadius: TK.radius,
              background: TK.accent,
              color: "#fff",
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "-.01em",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              boxShadow: `0 8px 22px ${rgba(TK.accent, 0.32)}`,
            }}
          >
            Get started
            <Icon name="arrowGo" size={20} color="#fff" stroke={2.2} />
          </a>
          <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 12, color: TK.muted }}>
            No account needed · Pay only for what you print
          </p>
        </div>
      }
    >
      <div className="pg-fade" style={{ padding: "72px 22px 24px" }}>
        <Logo size={26} />

        <h1
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: TK.ink,
            letterSpacing: "-.03em",
            lineHeight: 1.08,
            margin: "34px 0 12px",
          }}
        >
          Print anything.
          <br />
          <span style={{ color: TK.accent }}>Skip the queue.</span>
        </h1>
        <p style={{ fontSize: 16, color: TK.inkSoft, lineHeight: 1.5, margin: "0 0 8px" }}>
          Self-service printing at {KIOSK.name}. Upload from your phone, tap to
          configure, pay, and grab your pages — all in under a minute.
        </p>

        <div style={{ display: "grid", gap: 18, margin: "30px 0 0" }}>
          {STEPS.map((s) => (
            <StepRow key={s.title} {...s} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
