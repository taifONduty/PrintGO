"use client";

import React from "react";

// Official brand logos shipped as SVGs under /public/logos. Rendered with plain
// <img> so each SVG keeps its own aspect ratio; height is fixed and width auto.

export function BkashLogo({ height = 22 }: { height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logos/bkash.svg" alt="bKash" style={{ height, width: "auto" }} />;
}

export function NagadLogo({ height = 18 }: { height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logos/nagad.svg" alt="Nagad" style={{ height, width: "auto" }} />;
}

// Visa + Mastercard + American Express, side by side.
export function CardLogos() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {/* eslint-disable @next/next/no-img-element */}
      <img src="/logos/visa.svg" alt="Visa" style={{ height: 11, width: "auto" }} />
      <img src="/logos/mastercard.svg" alt="Mastercard" style={{ height: 17, width: "auto" }} />
      <img src="/logos/amex.svg" alt="American Express" style={{ height: 18, width: "auto" }} />
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}
