import type { Tone } from "./constants";

/** バッジ等で使う色調ごとのクラス */
export const TONE_CLASSES: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700 ring-slate-500/15",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  teal: "bg-teal-50 text-teal-700 ring-teal-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  orange: "bg-orange-50 text-orange-700 ring-orange-600/20",
};

export const TONE_DOT_CLASSES: Record<Tone, string> = {
  gray: "bg-slate-400",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  teal: "bg-teal-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
};
