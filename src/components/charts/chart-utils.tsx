"use client";

import type { ReactNode } from "react";

import { formatYen } from "@/lib/format";

/** グラフ配色（検証済みカテゴリカルパレット。系列には固定順で割り当てる） */
export const SERIES = {
  1: "var(--chart-1)",
  2: "var(--chart-2)",
  3: "var(--chart-3)",
  4: "var(--chart-4)",
  5: "var(--chart-5)",
  6: "var(--chart-6)",
  7: "var(--chart-7)",
} as const;

export const GRID_STROKE = "oklch(0.92 0.006 255)";
export const AXIS_TICK = { fill: "oklch(0.5 0.02 262)", fontSize: 11 };

/** 軸目盛り用の金額表記（例: 1,500万 / 1.2億） */
export function axisYen(value: number): string {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1).replace(/\.0$/, "")}億`;
  return `${sign}${Math.round(abs / 10_000).toLocaleString("ja-JP")}万`;
}

export function TooltipCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-foreground">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function TooltipRow({ color, label, value }: { color?: string; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {color ? <span aria-hidden className="size-2.5 rounded-sm" style={{ background: color }} /> : null}
        {label}
      </span>
      <span className="num font-medium text-foreground">{value}</span>
    </div>
  );
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden className="size-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

export { formatYen };
