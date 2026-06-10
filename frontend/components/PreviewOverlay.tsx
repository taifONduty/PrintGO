"use client";

import React from "react";
import { TK } from "@/lib/theme";
import { Icon } from "@/components/ui";
import { fileContentUrl, type FileItem } from "@/lib/api";

// Bottom-sheet preview that renders the real print-ready PDF.
export function PreviewOverlay({ file, onClose }: { file: FileItem | null; onClose: () => void }) {
  if (!file) return null;
  const src = fileContentUrl(file.job_id, file.id);
  return (
    <div
      onClick={onClose}
      className="pg-fade"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        background: "rgba(20,16,12,.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pg-slideup"
        style={{
          background: TK.surface,
          borderTopLeftRadius: TK.radiusLg,
          borderTopRightRadius: TK.radiusLg,
          padding: "14px 18px 26px",
          maxHeight: "88%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 100, background: TK.line, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: TK.accentTint,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name={file.kind === "img" ? "file" : "doc1"} size={20} color={TK.accentDark} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15.5,
                fontWeight: 700,
                color: TK.ink,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {file.original_filename}
            </div>
            <div style={{ fontSize: 12.5, color: TK.muted }}>
              {file.page_count} page{file.page_count > 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="pg-press"
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "none",
              background: TK.card,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              fontSize: 20,
              color: TK.muted,
            }}
          >
            ✕
          </button>
        </div>
        {/* real document render */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <iframe
            src={src}
            title={file.original_filename}
            style={{
              width: "100%",
              height: "60vh",
              border: `1px solid ${TK.line}`,
              borderRadius: TK.radiusSm,
              background: "#fff",
              boxShadow: "0 8px 24px rgba(33,29,23,.12)",
            }}
          />
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: 12,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              color: TK.accent,
              textDecoration: "none",
            }}
          >
            Open in a new tab ↗
          </a>
        </div>
      </div>
    </div>
  );
}
