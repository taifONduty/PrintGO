// PrintGO design tokens — ported from the Claude Design prototype.
// Warm-amber, clean-utilitarian. Accent #EF7B1E, soft 16px corners.

function hexToRgb(hex: string) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// mix hex toward white by amount t (0..1)
function tint(hex: string, t: number) {
  const { r, g, b } = hexToRgb(hex);
  const m = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

export function shade(hex: string, t: number) {
  const { r, g, b } = hexToRgb(hex);
  const m = (c: number) => Math.round(c * (1 - t));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

const ACCENT = "#EF7B1E";
const RADIUS = 16; // "soft"

export const TK = {
  accent: ACCENT,
  accentDark: shade(ACCENT, 0.16),
  accentTint: tint(ACCENT, 0.86), // very light wash (header, selected bg)
  accentTint2: tint(ACCENT, 0.74),
  ink: "#211D17",
  inkSoft: "#4A443B",
  muted: "#8C8378",
  faint: "#B8AFA2",
  line: "#ECE6DC",
  lineSoft: "#F2EDE4",
  surface: "#FBF9F5",
  card: "#FFFFFF",
  danger: "#D14545",
  ok: "#2E9E5B",
  radius: RADIUS,
  radiusSm: Math.round(RADIUS * 0.6),
  radiusLg: Math.round(RADIUS * 1.4),
} as const;

export type Theme = typeof TK;

// Kiosk identity (display-only in the prototype's header chip).
export const KIOSK = { name: "Dhaka University", sub: "CSE Complex" };

// Format a money string from the API ("20.00") for display: "৳20.00".
export function taka(price: string | number) {
  return "৳" + String(price);
}
