import { ArrowDownIcon, ArrowRightIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** 導入効果のシミュレーション値（デモ企業を想定した試算。実績値ではない） */
export const IMPACT_TASKS = [
  { task: "日報集計", before: 10, after: 2, how: "紙の日報の回収・転記 → スマホ入力で自動集約" },
  { task: "勤怠集計", before: 8, after: 1.5, how: "タイムカードの手集計 → 打刻データから自動計算" },
  { task: "案件別原価集計", before: 12, after: 3, how: "Excel への二重入力 → 勤怠・経費から自動で原価計上" },
  { task: "売上集計", before: 5, after: 1.5, how: "月末の手作業 → ダッシュボードでリアルタイム把握" },
] as const;

export const IMPACT_HOURLY_COST = 2800;

export function impactTotals() {
  const before = IMPACT_TASKS.reduce((s, t) => s + t.before, 0);
  const after = IMPACT_TASKS.reduce((s, t) => s + t.after, 0);
  const monthly = before - after;
  return { before, after, monthly, yearly: monthly * 12, yearlyCost: monthly * 12 * IMPACT_HOURLY_COST };
}

const hours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)}時間`;

export function ImpactSimulation({ variant = "full" }: { variant?: "full" | "compact" }) {
  const totals = impactTotals();
  const max = Math.max(...IMPACT_TASKS.map((t) => t.before));

  const summary = (
    <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
      <div className="rounded-xl bg-muted/70 p-4 text-center">
        <p className="text-xs text-muted-foreground">導入前</p>
        <p className="text-2xl font-bold">
          月{totals.before}
          <span className="text-base">時間</span>
        </p>
      </div>
      <ArrowRightIcon className="mx-auto hidden size-5 text-muted-foreground sm:block" aria-hidden />
      <ArrowDownIcon className="mx-auto size-5 text-muted-foreground sm:hidden" aria-hidden />
      <div className="rounded-xl bg-primary/8 p-4 text-center">
        <p className="text-xs text-muted-foreground">導入後</p>
        <p className="text-2xl font-bold text-primary">
          月{totals.after}
          <span className="text-base">時間</span>
        </p>
      </div>
      <span className="mx-auto text-lg font-bold text-muted-foreground">=</span>
      <div className="rounded-xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-600/15">
        <p className="text-xs text-emerald-800">削減時間</p>
        <p className="text-2xl font-bold text-emerald-700">
          月{totals.monthly}
          <span className="text-base">時間</span>
        </p>
        <p className="text-xs font-semibold text-emerald-800">年間 {totals.yearly}時間 削減</p>
      </div>
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        {summary}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">※デモ企業を想定したシミュレーション（実績値ではありません）</p>
          <Link href="/reports#impact" className="text-sm font-medium text-primary hover:underline">
            内訳を見る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summary}
      <div className="space-y-1">
        <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-hidden>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-slate-300" />
            導入前（月）
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary" />
            導入後（月）
          </span>
        </div>
        <ul className="divide-y">
          {IMPACT_TASKS.map((t) => (
            <li key={t.task} className="grid gap-2 py-3 md:grid-cols-[9rem_1fr_6rem] md:items-center">
              <div>
                <p className="text-sm font-semibold">{t.task}</p>
                <p className="text-xs text-muted-foreground md:hidden">{t.how}</p>
              </div>
              <div className="space-y-1.5">
                {[
                  { value: t.before, className: "bg-slate-300", label: "導入前" },
                  { value: t.after, className: "bg-primary", label: "導入後" },
                ].map((bar) => (
                  <div key={bar.label} className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 rounded-full bg-muted/60">
                      <div className={cn("h-full rounded-full", bar.className)} style={{ width: `${(bar.value / max) * 100}%` }} />
                    </div>
                    <span className="num w-16 text-right text-xs text-muted-foreground">
                      {bar.label} {hours(bar.value)}
                    </span>
                  </div>
                ))}
                <p className="hidden text-xs text-muted-foreground md:block">{t.how}</p>
              </div>
              <p className="text-sm font-bold text-emerald-700 md:text-right">−{hours(t.before - t.after)}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-3 rounded-xl bg-gradient-to-br from-emerald-50 to-sky-50 p-4 ring-1 ring-emerald-600/10 sm:flex-row sm:items-center">
        <SparklesIcon className="size-6 shrink-0 text-emerald-600" aria-hidden />
        <p className="text-sm leading-relaxed">
          年間 <strong className="text-base">{totals.yearly}時間</strong> の事務作業を削減。事務担当の時間単価 {IMPACT_HOURLY_COST.toLocaleString("ja-JP")}円で換算すると
          <strong className="text-base"> 年間約{Math.round(totals.yearlyCost / 10_000)}万円 </strong>
          相当です。浮いた時間を見積・営業・現場管理に充てられます。
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        ※デモ企業（従業員10名規模の設備工事会社）を想定したシミュレーションです。実際の効果は業務内容・運用により異なります。
      </p>
    </div>
  );
}
