import { ClockIcon } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Yen } from "@/components/common/money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMinutes, formatShortDate, formatTime } from "@/lib/format";
import type { ProjectAttendanceRow } from "@/server/queries/projects";

export function ProjectAttendanceTable({ rows, showCost }: { rows: ProjectAttendanceRow[]; showCost: boolean }) {
  if (rows.length === 0) {
    return <EmptyState icon={ClockIcon} title="この案件の勤怠記録はまだありません" description="作業員が出勤時に案件を選んで打刻すると、ここに集計されます。" />;
  }
  const totalMinutes = rows.reduce((s, r) => s + (r.workMinutes ?? 0), 0);
  const totalCost = rows.reduce((s, r) => s + (r.laborCost ?? 0), 0);
  const people = new Set(rows.map((r) => r.employeeName)).size;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
          <p className="text-xs text-muted-foreground">延べ作業時間</p>
          <p className="num text-lg font-bold">{formatMinutes(totalMinutes)}</p>
        </div>
        <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
          <p className="text-xs text-muted-foreground">延べ人工</p>
          <p className="num text-lg font-bold">
            {rows.length}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">人日（{people}名）</span>
          </p>
        </div>
        <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
          <p className="text-xs text-muted-foreground">労務費</p>
          <p className="text-lg font-bold">{showCost ? <Yen value={totalCost} /> : <span className="text-muted-foreground">—</span>}</p>
        </div>
      </div>
      <div className="max-h-[560px] overflow-auto rounded-xl bg-card ring-1 ring-foreground/8">
        <Table className="min-w-[620px]">
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead className="pl-4">日付</TableHead>
              <TableHead>作業員</TableHead>
              <TableHead className="text-right">出勤</TableHead>
              <TableHead className="text-right">退勤</TableHead>
              <TableHead className="text-right">休憩</TableHead>
              <TableHead className="text-right">実働</TableHead>
              <TableHead className="text-right">残業</TableHead>
              {showCost ? <TableHead className="pr-4 text-right">労務費</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="num pl-4 whitespace-nowrap">{formatShortDate(r.workDate)}</TableCell>
                <TableCell className="whitespace-nowrap">{r.employeeName}</TableCell>
                <TableCell className="num text-right">{formatTime(r.clockIn)}</TableCell>
                <TableCell className="num text-right">
                  {r.clockOut ? formatTime(r.clockOut) : <span className="text-xs text-amber-700">未打刻</span>}
                </TableCell>
                <TableCell className="num text-right text-muted-foreground">{r.breakMinutes}分</TableCell>
                <TableCell className="num text-right font-medium">{formatMinutes(r.workMinutes)}</TableCell>
                <TableCell className="num text-right">
                  {r.overtimeMinutes ? <span className="text-amber-700">{formatMinutes(r.overtimeMinutes)}</span> : "—"}
                </TableCell>
                {showCost ? (
                  <TableCell className="pr-4 text-right">
                    <Yen value={r.laborCost} />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
