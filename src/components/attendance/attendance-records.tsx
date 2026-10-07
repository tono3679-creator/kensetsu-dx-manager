import type { ReactNode } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMinutes, formatShortDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, AttendanceTotals } from "@/server/queries/attendance";

export function AttendanceTotalsCards({ totals, extra }: { totals: AttendanceTotals; extra?: ReactNode }) {
  const items = [
    { label: "出勤日数", value: `${totals.workDays}日` },
    { label: "総労働時間", value: formatMinutes(totals.totalMinutes) },
    { label: "残業時間", value: formatMinutes(totals.overtimeMinutes), warn: totals.overtimeMinutes >= 45 * 60 },
    { label: "退勤打刻漏れ", value: `${totals.missingClockOut}件`, warn: totals.missingClockOut > 0 },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-card p-3 ring-1 ring-foreground/8 md:p-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className={cn("num mt-1 text-xl font-bold md:text-2xl", item.warn && "text-amber-700")}>{item.value}</p>
        </div>
      ))}
      {extra}
    </div>
  );
}

/** 勤怠の明細（PC はテーブル、スマートフォンはリスト） */
export function AttendanceRecords({
  records,
  actions,
}: {
  records: AttendanceRecord[];
  /** 行ごとの操作（管理者の修正ボタンなど） */
  actions?: (record: AttendanceRecord) => ReactNode;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl bg-card ring-1 ring-foreground/8 md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">日付</TableHead>
              <TableHead>現場</TableHead>
              <TableHead className="text-right">出勤</TableHead>
              <TableHead className="text-right">退勤</TableHead>
              <TableHead className="text-right">休憩</TableHead>
              <TableHead className="text-right">実働</TableHead>
              <TableHead className="text-right">残業</TableHead>
              {actions ? <TableHead className="w-24 pr-4" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="num pl-4 whitespace-nowrap">{formatShortDate(r.workDate)}</TableCell>
                <TableCell className="max-w-64 truncate">{r.projectName ?? <span className="text-muted-foreground">{r.note ?? "社内作業"}</span>}</TableCell>
                <TableCell className="num text-right">{formatTime(r.clockIn)}</TableCell>
                <TableCell className="num text-right">{r.clockOut ? formatTime(r.clockOut) : <span className="text-xs font-medium text-amber-700">未打刻</span>}</TableCell>
                <TableCell className="num text-right text-muted-foreground">{r.breakMinutes}分</TableCell>
                <TableCell className="num text-right font-medium">{formatMinutes(r.workMinutes)}</TableCell>
                <TableCell className="num text-right">{r.overtimeMinutes ? <span className="text-amber-700">{formatMinutes(r.overtimeMinutes)}</span> : "—"}</TableCell>
                {actions ? <TableCell className="pr-4 text-right">{actions(r)}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/8 md:hidden">
        {records.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-16 shrink-0">
              <p className="num text-sm font-semibold">{formatShortDate(r.workDate)}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="num text-sm">
                {formatTime(r.clockIn)} 〜 {r.clockOut ? formatTime(r.clockOut) : <span className="font-medium text-amber-700">未打刻</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{r.projectName ?? r.note ?? "社内作業"}</p>
            </div>
            <div className="text-right">
              <p className="num text-sm font-semibold">{formatMinutes(r.workMinutes)}</p>
              {r.overtimeMinutes ? <p className="num text-xs text-amber-700">残業 {formatMinutes(r.overtimeMinutes)}</p> : null}
            </div>
            {actions ? actions(r) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
