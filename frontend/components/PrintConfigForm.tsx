"use client";

import React from "react";
import { TK } from "@/lib/theme";
import {
  FieldLabel,
  Stepper,
  ColorModeCard,
  DuplexChoice,
  SelectField,
} from "@/components/ui";

export interface LocalConfig {
  color: boolean;
  copies: number;
  duplex: boolean;
  range: "all" | "custom";
  customPages: number; // print first N pages when range === "custom"
}

function Block({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 22 }}>{children}</div>;
}

export function PrintConfigForm({
  cfg,
  pageCount,
  bwRate,
  colorRate,
  onChange,
}: {
  cfg: LocalConfig;
  pageCount: number;
  bwRate: number;
  colorRate: number;
  onChange: (patch: Partial<LocalConfig>) => void;
}) {
  return (
    <div>
      {/* copies */}
      <Block>
        <FieldLabel hint="per document set">Copies</FieldLabel>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: TK.muted }}>How many sets?</span>
          <Stepper value={cfg.copies} onChange={(v) => onChange({ copies: v })} />
        </div>
      </Block>

      {/* color */}
      <Block>
        <FieldLabel>Color</FieldLabel>
        <div style={{ display: "flex", gap: 12 }}>
          <ColorModeCard
            mode="bw"
            label="Black & White"
            price={bwRate}
            selected={!cfg.color}
            onClick={() => onChange({ color: false })}
          />
          <ColorModeCard
            mode="color"
            label="Color"
            price={colorRate}
            selected={cfg.color}
            onClick={() => onChange({ color: true })}
          />
        </div>
      </Block>

      {/* duplex */}
      <Block>
        <FieldLabel hint="save paper">Sides</FieldLabel>
        <DuplexChoice value={cfg.duplex} onChange={(v) => onChange({ duplex: v })} />
      </Block>

      {/* page range */}
      <Block>
        <FieldLabel>Page range</FieldLabel>
        <SelectField
          value={cfg.range}
          onChange={(v) => onChange({ range: v as LocalConfig["range"] })}
          options={[
            { value: "all", label: `All pages (${pageCount})` },
            { value: "custom", label: "Custom range…" },
          ]}
        />
        {cfg.range === "custom" && (
          <div
            className="pg-rise"
            style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}
          >
            <span style={{ fontSize: 13.5, color: TK.muted }}>Print first</span>
            <Stepper
              value={cfg.customPages}
              min={1}
              max={pageCount}
              onChange={(v) => onChange({ customPages: v })}
            />
            <span style={{ fontSize: 13.5, color: TK.muted }}>of {pageCount} pages</span>
          </div>
        )}
      </Block>
    </div>
  );
}
