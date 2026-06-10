"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { TK, rgba } from "@/lib/theme";
import { Icon } from "@/components/ui";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const MAX_BYTES = 20 * 1024 * 1024;

export function FileDropzone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length) onFiles(accepted);
    },
    [onFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_BYTES,
    multiple: true,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className="pg-tile pg-press"
      style={{
        width: "100%",
        minHeight: 240,
        background: isDragActive ? TK.accentTint : TK.card,
        border: `2px dashed ${isDragActive ? TK.accent : TK.line}`,
        borderRadius: TK.radius,
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input {...getInputProps()} />
      <span
        style={{
          width: 64,
          height: 64,
          borderRadius: TK.radiusSm,
          background: TK.accent,
          display: "grid",
          placeItems: "center",
          boxShadow: `0 10px 24px ${rgba(TK.accent, 0.3)}`,
        }}
      >
        <Icon name="upload" size={30} color="#fff" stroke={2.4} />
      </span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 17, color: TK.ink }}>
          {isDragActive ? "Drop your file here" : "Tap to choose a file"}
        </div>
        <div style={{ fontSize: 13.5, color: TK.muted, marginTop: 4, lineHeight: 1.45 }}>
          or drag &amp; drop it in
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          color: TK.faint,
          fontWeight: 600,
          letterSpacing: ".01em",
        }}
      >
        PDF · DOCX · PPTX · JPG · PNG — up to 20 MB
      </div>
    </div>
  );
}
