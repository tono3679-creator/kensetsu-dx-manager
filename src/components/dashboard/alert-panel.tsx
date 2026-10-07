import {
  CalendarXIcon,
  ChevronRightIcon,
  ClipboardXIcon,
  ClockAlertIcon,
  CheckCircle2Icon,
  FileWarningIcon,
  OctagonAlertIcon,
  TriangleAlertIcon,
  UserXIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { AlertItem, AlertKind } from "@/server/queries/dashboard";

const KIND_META: Record<AlertKind, { label: string; icon: LucideIcon; className: string }> = {
  cost_over: { label: "予算超過", icon: OctagonAlertIcon, className: "bg-red-50 text-red-700" },
  overdue: { label: "工期超過", icon: CalendarXIcon, className: "bg-red-50 text-red-700" },
  cost_warning: { label: "原価注意", icon: TriangleAlertIcon, className: "bg-amber-50 text-amber-700" },
  unbilled: { label: "未請求", icon: FileWarningIcon, className: "bg-orange-50 text-orange-700" },
  report_missing: { label: "日報未提出", icon: ClipboardXIcon, className: "bg-blue-50 text-blue-700" },
  clock_out_missing: { label: "退勤打刻漏れ", icon: ClockAlertIcon, className: "bg-slate-100 text-slate-700" },
  attendance_missing: { label: "勤怠未入力", icon: UserXIcon, className: "bg-slate-100 text-slate-700" },
};

const ORDER: AlertKind[] = ["cost_over", "overdue", "cost_warning", "unbilled", "report_missing", "clock_out_missing", "attendance_missing"];

function AlertRow({ alert }: { alert: AlertItem }) {
  const meta = KIND_META[alert.kind];
  const Icon = meta.icon;
  return (
    <li>
      <Link href={alert.href} className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition hover:bg-muted/60">
        <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", meta.className)}>
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", meta.className)}>{meta.label}</span>
            <span className="truncate text-sm font-medium group-hover:text-primary">{alert.title}</span>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{alert.detail}</span>
        </span>
        <ChevronRightIcon className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

/** 「要確認」エリア: 対応が必要な案件・勤怠・日報をまとめて表示 */
export function AlertPanel({ alerts, visible = 6 }: { alerts: AlertItem[]; visible?: number }) {
  const counts = ORDER.map((kind) => ({ kind, count: alerts.filter((a) => a.kind === kind).length })).filter((c) => c.count > 0);

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <CheckCircle2Icon className="size-8 text-emerald-600" aria-hidden />
        <p className="text-sm font-medium">確認が必要な項目はありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {counts.map(({ kind, count }) => (
          <span key={kind} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", KIND_META[kind].className)}>
            {KIND_META[kind].label}
            <span className="num font-bold">{count}</span>
          </span>
        ))}
      </div>
      <ul className="-mx-2 divide-y">
        {alerts.slice(0, visible).map((alert, i) => (
          <AlertRow key={`${alert.kind}-${alert.href}-${i}`} alert={alert} />
        ))}
      </ul>
      {alerts.length > visible ? (
        <details className="group">
          <summary className="cursor-pointer list-none text-center text-sm font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">残り{alerts.length - visible}件を表示</span>
            <span className="hidden group-open:inline">閉じる</span>
          </summary>
          <ul className="-mx-2 mt-2 divide-y border-t">
            {alerts.slice(visible).map((alert, i) => (
              <AlertRow key={`${alert.kind}-${alert.href}-more-${i}`} alert={alert} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
