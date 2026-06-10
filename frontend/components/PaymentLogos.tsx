"use client";

import React from "react";

// Brand-coloured payment logos for the Pay screen. Rendered as inline SVG
// wordmarks/marks in the brand colours (bKash magenta, Nagad orange-red,
// Visa + Mastercard) so they read as real logos rather than letter chips.

export function BkashLogo({ height = 22 }: { height?: number }) {
  return (
    <svg height={height} viewBox="0 0 104 34" role="img" aria-label="bKash">
      <text
        x="0"
        y="26"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="28"
        fontWeight={800}
        letterSpacing="-1"
        fill="#E2136E"
      >
        bKash
      </text>
      <circle cx="97" cy="9" r="5" fill="#E2136E" />
      <circle cx="97" cy="9" r="2.2" fill="#fff" />
    </svg>
  );
}

export function NagadLogo({ height = 20 }: { height?: number }) {
  return (
    <svg height={height} viewBox="0 0 110 30" role="img" aria-label="Nagad">
      <defs>
        <linearGradient id="nagad-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6921E" />
          <stop offset="1" stopColor="#ED1C24" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="24"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="26"
        fontWeight={800}
        letterSpacing="-0.5"
        fill="url(#nagad-g)"
      >
        Nagad
      </text>
    </svg>
  );
}

// Visa + Mastercard + American Express, squeezed side by side into one mark.
export function CardLogos({ height = 16 }: { height?: number }) {
  const tile: React.CSSProperties = {
    height: height + 6,
    display: "grid",
    placeItems: "center",
    padding: "0 4px",
    borderRadius: 4,
    border: "1px solid #ECE6DC",
    background: "#fff",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {/* Visa */}
      <div style={tile}>
        <svg height={height - 4} viewBox="0 0 60 20" role="img" aria-label="Visa">
          <text x="0" y="17" fontFamily="Arial, Helvetica, sans-serif" fontSize="20" fontWeight={800} fontStyle="italic" letterSpacing="1" fill="#1A1F71">
            VISA
          </text>
        </svg>
      </div>
      {/* Mastercard */}
      <div style={tile}>
        <svg height={height} viewBox="0 0 40 26" role="img" aria-label="Mastercard">
          <circle cx="15" cy="13" r="11" fill="#EB001B" />
          <circle cx="25" cy="13" r="11" fill="#F79E1B" />
          <path d="M20 4.6a11 11 0 010 16.8 11 11 0 010-16.8z" fill="#FF5F00" />
        </svg>
      </div>
      {/* American Express */}
      <div style={{ ...tile, background: "#006FCF", border: "1px solid #006FCF" }}>
        <svg height={height - 6} viewBox="0 0 64 16" role="img" aria-label="American Express">
          <text x="0" y="13" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight={800} letterSpacing="0.5" fill="#fff">
            AMEX
          </text>
        </svg>
      </div>
    </div>
  );
}
