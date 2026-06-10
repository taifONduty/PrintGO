"use client";

import React from "react";
import { TK } from "@/lib/theme";
import { Icon, PlaceholderArt } from "@/components/ui";
import type { FileItem } from "@/lib/api";

// Bottom-sheet preview of a file's (stylised, placeholder) pages.
export function PreviewOverlay({ file, onClose }: { file: FileItem | null; onClose: () => void }) {
  if (!file) return null;
  const pages = Math.min(file.page_count, 4);
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
        <div
          className="pg-scroll"
          style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, alignItems: "center", paddingBottom: 8 }}
        >
          {Array.from({ length: pages }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 200,
                minHeight: 280,
                background: "#fff",
                borderRadius: TK.radiusSm,
                border: `1px solid ${TK.line}`,
                boxShadow: "0 8px 24px rgba(33,29,23,.12)",
                padding: file.kind === "img" ? 0 : "22px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {file.kind === "img" ? (
                <div style={{ minHeight: 280, width: "100%" }}>
                  <PlaceholderArt />
                </div>
              ) : (
                <>
                  <div style={{ height: 12, width: "55%", borderRadius: 3, background: TK.accent, opacity: 0.8 }} />
                  <div style={{ height: 6, width: "92%", borderRadius: 3, background: TK.line }} />
                  <div style={{ height: 6, width: "88%", borderRadius: 3, background: TK.line }} />
                  <div style={{ height: 6, width: "94%", borderRadius: 3, background: TK.line }} />
                  <div style={{ height: 6, width: "70%", borderRadius: 3, background: TK.line }} />
                  <div style={{ height: 60, borderRadius: 5, background: TK.lineSoft, margin: "6px 0" }} />
                  <div style={{ height: 6, width: "90%", borderRadius: 3, background: TK.line }} />
                  <div style={{ height: 6, width: "85%", borderRadius: 3, background: TK.line }} />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
