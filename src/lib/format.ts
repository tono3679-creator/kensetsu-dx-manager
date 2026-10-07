import { toJstDateString, toJstTimeString } from "./date";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const integerFormatter = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 });

const EMPTY = "—";

/** 1,234,567円 */
export function formatYen(value: number | null | undefined, options: { signed?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  const sign = options.signed && value > 0 ? "+" : "";
  return `${sign}${integerFormatter.format(value)}円`;
}

/** ¥1,234,567（表やカードの補助表記用） */
export function formatYenSymbol(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  const abs = integerFormatter.format(Math.abs(value));
  return value < 0 ? `-¥${abs}` : `¥${abs}`;
}

/** 1,234万円 / 1.25億円（グラフ軸・KPI の補助表記用） */
export function formatYenCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(2).replace(/\.?0+$/, "")}億円`;
  if (abs >= 10_000) return `${sign}${integerFormatter.format(Math.round(abs / 10_000))}万円`;
  return `${sign}${integerFormatter.format(abs)}円`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return decimalFormatter.format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return `${value.toFixed(digits)}%`;
}

function toDateString(value: string): string {
  // "YYYY-MM-DD" はそのまま、ISO 日時は日本時間の日付に変換
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toJstDateString(new Date(value));
}

/** 2026/10/07 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY;
  return toDateString(value).replaceAll("-", "/");
}

/** 2026/10/07(水) */
export function formatDateWithWeekday(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const date = toDateString(value);
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${date.replaceAll("-", "/")}(${WEEKDAYS[dow]})`;
}

/** 10/07(水) */
export function formatShortDate(value: string | null | undefined): string {
  if (!value) return EMPTY;
  return formatDateWithWeekday(value).slice(5);
}

/** 24時間表記 "08:05"。ISO 日時・"HH:MM:SS" どちらも受け付ける */
export function formatTime(value: string | null | undefined): string {
  if (!value) return EMPTY;
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  return toJstTimeString(value);
}

/** 分 → "8:30" */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return EMPTY;
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minutes));
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

/** 分 → "8.5h"（グラフ・集計用） */
export function formatHours(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return EMPTY;
  return `${(minutes / 60).toFixed(1)}h`;
}

/** "2026-10" → "2026年10月" */
export function formatMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${y}年${m}月`;
}

/** "2026-10" → "10月" */
export function formatMonthShort(key: string): string {
  return `${Number(key.split("-")[1])}月`;
}

export function fullName(lastName: string, firstName: string): string {
  return `${lastName} ${firstName}`;
}
