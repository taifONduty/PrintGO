"use client";

import React from "react";
import { TK, rgba } from "@/lib/theme";

// ── Icons ─────────────────────────────────────────────────────────────────────
type IconName =
  | "plus"
  | "minus"
  | "file"
  | "trash"
  | "check"
  | "chevronD"
  | "back"
  | "pencil"
  | "phone"
  | "lock"
  | "printer"
  | "doc1"
  | "doc2"
  | "qr"
  | "arrowGo"
  | "spark"
  | "upload"
  | "expand";

export function Icon({
  name,
  size = 20,
  stroke = 2,
  color = "currentColor",
  style,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  const p = {
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const ic: Record<IconName, React.ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" {...p} />,
    minus: <path d="M5 12h14" {...p} />,
    file: (
      <g {...p}>
        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
        <path d="M14 3v5h5" />
      </g>
    ),
    trash: (
      <path
        d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"
        {...p}
      />
    ),
    check: <path d="M4 12.5l5 5L20 6.5" {...p} />,
    chevronD: <path d="M5 9l7 7 7-7" {...p} />,
    back: <path d="M19 12H5M5 12l7-7M5 12l7 7" {...p} />,
    pencil: <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" {...p} />,
    phone: (
      <path
        d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L19 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"
        {...p}
      />
    ),
    lock: (
      <g {...p}>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </g>
    ),
    printer: (
      <g {...p}>
        <path d="M6 9V3h12v6" />
        <rect x="3" y="9" width="18" height="8" rx="2" />
        <path d="M7 17h10v4H7z" />
      </g>
    ),
    doc1: (
      <g {...p}>
        <rect x="6" y="3" width="12" height="18" rx="1.5" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </g>
    ),
    doc2: (
      <g {...p}>
        <rect x="5" y="4" width="14" height="16" rx="1.5" />
        <path d="M9 9h6M9 13h6" strokeDasharray="2 2" />
      </g>
    ),
    qr: (
      <g {...p}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3M21 14v7M17 21h4M17 17h.01" />
      </g>
    ),
    arrowGo: <path d="M5 12h13M13 6l6 6-6 6" {...p} />,
    spark: (
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"
        {...p}
      />
    ),
    upload: (
      <g {...p}>
        <path d="M12 16V4M12 4l-5 5M12 4l5 5" />
        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </g>
    ),
    expand: (
      <path
        d="M8 3H4a1 1 0 00-1 1v4M16 3h4a1 1 0 011 1v4M8 21H4a1 1 0 01-1-1v-4M16 21h4a1 1 0 001-1v-4"
        {...p}
      />
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      {ic[name]}
    </svg>
  );
}

// ── Brand logo ──────────────────────────────────────────────────────────────
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div
        style={{
          width: size * 1.5,
          height: size * 1.5,
          borderRadius: size * 0.42,
          background: TK.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 12px ${rgba(TK.accent, 0.32)}`,
          flexShrink: 0,
        }}
      >
        <Icon name="arrowGo" size={size} color="#fff" stroke={2.6} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          fontWeight: 800,
          fontSize: size,
          letterSpacing: "-.02em",
          lineHeight: 1,
        }}
      >
        <span style={{ color: TK.ink }}>Print</span>
        <span style={{ color: TK.accent }}>GO</span>
      </div>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
type Variant = "primary" | "dark" | "danger" | "soft" | "ghost";
export function Button({
  children,
  onClick,
  variant = "primary",
  full = false,
  disabled = false,
  size = "lg",
  icon,
  style = {},
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  full?: boolean;
  disabled?: boolean;
  size?: "lg" | "md";
  icon?: IconName;
  style?: React.CSSProperties;
}) {
  const h = size === "lg" ? 56 : 44;
  const base: React.CSSProperties = {
    height: h,
    padding: size === "lg" ? "0 22px" : "0 20px",
    border: "none",
    borderRadius: TK.radius,
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: size === "lg" ? 17 : 15,
    letterSpacing: "-.01em",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    width: full ? "100%" : undefined,
    whiteSpace: "nowrap",
    ...style,
  };
  const skins: Record<Variant, React.CSSProperties> = {
    primary: {
      background: disabled ? TK.line : TK.accent,
      color: disabled ? TK.faint : "#fff",
      boxShadow: disabled ? "none" : `0 8px 22px ${rgba(TK.accent, 0.32)}`,
    },
    dark: { background: TK.ink, color: "#fff" },
    danger: { background: TK.danger, color: "#fff" },
    soft: { background: TK.accentTint, color: TK.accentDark },
    ghost: { background: "transparent", color: TK.inkSoft, border: `1.5px solid ${TK.line}` },
  };
  return (
    <button
      className="pg-press"
      style={{ ...base, ...skins[variant] }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {icon && <Icon name={icon} size={20} color="currentColor" stroke={2.2} />}
      {children}
    </button>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────
export function Stepper({
  value,
  min = 1,
  max = 99,
  onChange,
  disabled = false,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const bg = disabled ? TK.line : TK.accent;
  const btn = (label: "minus" | "plus", fn: () => void, off: boolean) => (
    <button
      className="pg-press"
      onClick={off || disabled ? undefined : fn}
      disabled={off || disabled}
      style={{
        width: 38,
        height: 38,
        border: "none",
        borderRadius: TK.radiusSm,
        cursor: off || disabled ? "default" : "pointer",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={label} size={20} stroke={2.6} color={off ? rgba("#ffffff", 0.5) : "#fff"} />
    </button>
  );
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        background: bg,
        borderRadius: TK.radius,
        padding: 3,
        boxShadow: disabled ? "none" : `0 6px 16px ${rgba(TK.accent, 0.28)}`,
      }}
    >
      {btn("minus", () => onChange(Math.max(min, value - 1)), value <= min)}
      <span
        style={{
          minWidth: 30,
          textAlign: "center",
          color: "#fff",
          fontWeight: 800,
          fontSize: 18,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      {btn("plus", () => onChange(Math.min(max, value + 1)), value >= max)}
    </div>
  );
}

// ── Color mode card ────────────────────────────────────────────────────────────
export function ColorModeCard({
  mode,
  label,
  price,
  selected,
  onClick,
}: {
  mode: "bw" | "color";
  label: string;
  price: number;
  selected: boolean;
  onClick: () => void;
}) {
  const cmyk = mode === "color";
  const c = cmyk ? ["#2C7BE5", "#E5318B", "#E9C81F"] : ["#3A3A3A", "#6E6E6E", "#9A9A9A"];
  return (
    <button
      className="pg-tile pg-press"
      onClick={onClick}
      style={{
        position: "relative",
        flex: 1,
        textAlign: "left",
        cursor: "pointer",
        background: selected ? TK.accentTint : TK.card,
        border: `1.5px solid ${selected ? TK.accent : TK.line}`,
        borderRadius: TK.radius,
        padding: "14px 14px 0",
        height: 124,
        overflow: "hidden",
        boxShadow: selected ? `0 8px 20px ${rgba(TK.accent, 0.16)}` : "none",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: TK.ink }}>{label}</div>
          <div
            style={{
              fontSize: 12.5,
              color: TK.muted,
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ৳{price}/page
          </div>
        </div>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            flexShrink: 0,
            border: selected ? "none" : `2px solid ${TK.line}`,
            background: selected ? TK.accent : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected && <Icon name="check" size={14} color="#fff" stroke={3} />}
        </span>
      </div>
      {/* CMYK / grayscale overlapping circles — lower-right corner */}
      <div style={{ position: "absolute", right: -8, bottom: -8, width: 70, height: 56 }}>
        <span
          style={{
            position: "absolute",
            left: 0,
            bottom: 14,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: c[0],
            opacity: cmyk ? 0.85 : 0.9,
            mixBlendMode: "multiply",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 18,
            bottom: 0,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: c[1],
            opacity: cmyk ? 0.85 : 0.9,
            mixBlendMode: "multiply",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 9,
            bottom: 6,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: c[2],
            opacity: cmyk ? 0.8 : 0.9,
            mixBlendMode: "multiply",
          }}
        />
      </div>
    </button>
  );
}

// ── Duplex choice ───────────────────────────────────────────────────────────────
export function DuplexChoice({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const opt = (val: boolean, label: string, icon: IconName) => {
    const on = value === val;
    return (
      <button
        className="pg-tile pg-press"
        onClick={() => onChange(val)}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          height: 56,
          padding: "0 16px",
          cursor: "pointer",
          fontFamily: "inherit",
          background: on ? TK.accentTint : TK.card,
          border: `1.5px solid ${on ? TK.accent : TK.line}`,
          borderRadius: TK.radius,
          boxShadow: on ? `0 6px 16px ${rgba(TK.accent, 0.14)}` : "none",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 15, color: TK.ink }}>{label}</span>
        <Icon name={icon} size={20} color={on ? TK.accent : TK.faint} />
      </button>
    );
  };
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {opt(false, "Single-sided", "doc1")}
      {opt(true, "Double-sided", "doc2")}
    </div>
  );
}

// ── Select field ──────────────────────────────────────────────────────────────
export function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          width: "100%",
          height: 52,
          padding: "0 44px 0 16px",
          border: `1.5px solid ${TK.line}`,
          borderRadius: TK.radius,
          background: TK.card,
          color: TK.ink,
          fontFamily: "inherit",
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      >
        <Icon name="chevronD" size={18} color={TK.muted} />
      </span>
    </div>
  );
}

// ── Field label ─────────────────────────────────────────────────────────────────
export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 9,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15, color: TK.ink, letterSpacing: "-.01em" }}>
        {children}
      </span>
      {hint && <span style={{ fontSize: 12.5, color: TK.muted }}>{hint}</span>}
    </div>
  );
}

// ── Spinner ─────────────────────────────────────────────────────────────────────
export function Spinner({ size = 46, color }: { size?: number; color?: string }) {
  const c = color || TK.accent;
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" style={{ animation: "pgSpin 1s linear infinite" }}>
      <circle cx="25" cy="25" r="20" fill="none" stroke={rgba(c, 0.18)} strokeWidth="5" />
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke={c}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="90 200"
      />
    </svg>
  );
}

// ── Summary row + section head ──────────────────────────────────────────────────
export function Row({
  k,
  v,
  muted,
}: {
  k: React.ReactNode;
  v: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "11px 0",
      }}
    >
      <span style={{ fontSize: 13.5, color: muted ? TK.muted : TK.inkSoft }}>{k}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: muted ? TK.muted : TK.ink,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {v}
      </span>
    </div>
  );
}

export function SectionHead({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        margin: "0 0 9px",
        padding: "0 2px",
      }}
    >
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          color: TK.muted,
        }}
      >
        {title}
      </span>
      {action && (
        <button
          onClick={onAction}
          className="pg-press"
          style={{
            border: "none",
            background: "none",
            color: TK.accent,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Icon name="pencil" size={14} color={TK.accent} />
          {action}
        </button>
      )}
    </div>
  );
}

// ── Faux page art (stylised placeholder, no real content) ───────────────────
export function PlaceholderArt() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "repeating-linear-gradient(135deg,#EFEAE1 0 8px,#F6F2EA 8px 16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
          fontSize: 10,
          color: "#A89E90",
          letterSpacing: ".02em",
        }}
      >
        image
      </span>
    </div>
  );
}

// Faux page body (orange title bar + grey text lines + a block).
function FauxPage({ kind }: { kind: FileKind }) {
  if (kind === "img") return <PlaceholderArt />;
  return (
    <>
      <div style={{ height: 9, width: "62%", borderRadius: 3, background: TK.accent, opacity: 0.85 }} />
      <div style={{ height: 5, width: "88%", borderRadius: 3, background: TK.line }} />
      <div style={{ height: 5, width: "94%", borderRadius: 3, background: TK.line }} />
      <div style={{ height: 5, width: "74%", borderRadius: 3, background: TK.line }} />
      <div
        style={{
          height: 46,
          borderRadius: 4,
          background: TK.lineSoft,
          border: `1px solid ${TK.line}`,
          margin: "4px 0",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name="doc1" size={20} color={TK.faint} />
      </div>
      <div style={{ height: 5, width: "90%", borderRadius: 3, background: TK.line }} />
      <div style={{ height: 5, width: "66%", borderRadius: 3, background: TK.line }} />
    </>
  );
}

export type FileKind = "doc" | "img";

// PdfThumb renders a real, static first-page thumbnail of a PDF via an iframe
// (toolbar/scrollbars hidden, non-interactive).
function PdfThumb({ src }: { src: string }) {
  return (
    <iframe
      src={`${src}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
      title="preview"
      scrolling="no"
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        background: "#fff",
        pointerEvents: "none",
      }}
    />
  );
}

// ── Page preview card (upload grid tile) ────────────────────────────────────
export function PagePreview({
  name,
  pages,
  kind,
  previewSrc,
  processing = false,
  onDelete,
  onExpand,
}: {
  name: string;
  pages: number;
  kind: FileKind;
  previewSrc?: string;
  processing?: boolean;
  onDelete?: () => void;
  onExpand?: () => void;
}) {
  return (
    <div className="pg-tile" style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1.4",
          background: "#fff",
          borderRadius: TK.radiusSm,
          border: `1px solid ${TK.line}`,
          boxShadow: "0 6px 18px rgba(33,29,23,.08)",
          overflow: "hidden",
          padding: previewSrc ? 0 : kind === "img" ? 0 : "14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 7,
        }}
      >
        {previewSrc ? <PdfThumb src={previewSrc} /> : <FauxPage kind={kind} />}
        {processing && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,.66)",
              backdropFilter: "blur(1px)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Spinner size={30} />
          </div>
        )}
      </div>
      {!processing && (
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
          {onExpand && (
            <button className="pg-press" onClick={onExpand} title="Preview" style={iconBtn}>
              <Icon name="expand" size={16} color={TK.inkSoft} stroke={2.4} />
            </button>
          )}
          {onDelete && (
            <button className="pg-press" onClick={onDelete} title="Remove" style={iconBtn}>
              <Icon name="trash" size={16} color={TK.danger} stroke={2.2} />
            </button>
          )}
        </div>
      )}
      <div style={{ marginTop: 9, textAlign: "center" }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: TK.ink,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 11, color: TK.muted }}>
          {processing ? "Processing…" : `${pages} page${pages > 1 ? "s" : ""}`}
        </div>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
  border: "none",
  background: "rgba(255,255,255,.92)",
  boxShadow: "0 2px 8px rgba(0,0,0,.16)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

// ── "Add more" grid tile ─────────────────────────────────────────────────────
export function AddMoreTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="pg-tile pg-press"
      onClick={onClick}
      style={{
        width: "100%",
        aspectRatio: "1 / 1.4",
        background: TK.card,
        border: `2px dashed ${TK.line}`,
        borderRadius: TK.radius,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: TK.radiusSm,
          background: TK.accentTint,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name="plus" size={22} color={TK.accent} stroke={2.6} />
      </span>
      <span style={{ fontWeight: 700, fontSize: 14, color: TK.inkSoft }}>Add more</span>
    </button>
  );
}

// ── Mini doc thumbnail (configure files strip) ───────────────────────────────
export function MiniDoc({
  name,
  kind,
  previewSrc,
  onClick,
}: {
  name: string;
  kind: FileKind;
  previewSrc?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="pg-press"
      onClick={onClick}
      style={{ flexShrink: 0, width: 70, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
    >
      <div
        style={{
          width: 70,
          height: 92,
          borderRadius: TK.radiusSm,
          border: `1px solid ${TK.line}`,
          background: "#fff",
          boxShadow: "0 3px 10px rgba(33,29,23,.07)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          padding: previewSrc ? 0 : kind === "img" ? 0 : "9px 8px",
        }}
      >
        {previewSrc ? (
          <PdfThumb src={previewSrc} />
        ) : kind === "img" ? (
          <PlaceholderArt />
        ) : (
          <>
            <div style={{ height: 6, width: "60%", borderRadius: 2, background: TK.accent, opacity: 0.8 }} />
            <div style={{ height: 4, width: "90%", borderRadius: 2, background: TK.line }} />
            <div style={{ height: 4, width: "80%", borderRadius: 2, background: TK.line }} />
            <div style={{ height: 4, width: "88%", borderRadius: 2, background: TK.line }} />
          </>
        )}
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: TK.muted,
          marginTop: 5,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {name}
      </div>
    </button>
  );
}

// Card container used across screens.
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: TK.card,
        border: `1px solid ${TK.line}`,
        borderRadius: TK.radius,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
