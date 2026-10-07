"use client";

import { AlertTriangleIcon, CheckCircle2Icon, LogInIcon, LogOutIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { SubmitButton, useActionToast } from "@/components/common/form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { calcOvertimeMinutes } from "@/lib/attendance";
import { formatDateWithWeekday, formatMinutes, formatShortDate, formatTime } from "@/lib/format";
import { initialActionResult } from "@/lib/validation/common";
import { clockInAction, clockOutAction } from "@/server/actions/attendance";
import type { AttendanceRecord } from "@/server/queries/attendance";
import type { ProjectOption } from "@/server/queries/common";

const BREAK_OPTIONS = [0, 30, 45, 60, 75, 90, 120];

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const clockFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function ProjectSelect({ projects, defaultValue, id }: { projects: ProjectOption[]; defaultValue: string; id: string }) {
  return (
    <NativeSelect id={id} name="projectId" defaultValue={defaultValue} className="[&_select]:h-12 [&_select]:text-base">
      <option value="">現場なし（社内作業・倉庫など）</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </NativeSelect>
  );
}

/**
 * 出勤・退勤の打刻カード。手袋を外してすぐ押せるよう、ボタンは大きく1画面に1つだけ表示する。
 */
export function ClockCard({
  today,
  record,
  yesterdayOpen,
  projects,
  standardWorkMinutes,
  defaultBreakMinutes,
}: {
  today: string;
  record: AttendanceRecord | null;
  yesterdayOpen: AttendanceRecord | null;
  projects: ProjectOption[];
  standardWorkMinutes: number;
  defaultBreakMinutes: number;
}) {
  const now = useNow();
  const [inState, inAction] = useActionState(clockInAction, initialActionResult);
  const [outState, outAction] = useActionState(clockOutAction, initialActionResult);
  const [fixState, fixAction] = useActionState(clockOutAction, initialActionResult);
  useActionToast(inState);
  useActionToast(outState);
  useActionToast(fixState);

  const defaultProject = projects.find((p) => p.status === "in_progress")?.id ?? "";
  const elapsed = record && !record.clockOut && now ? Math.max(0, Math.floor((now.getTime() - new Date(record.clockIn).getTime()) / 60000)) : null;

  return (
    <div className="space-y-4">
      {yesterdayOpen ? (
        <form action={fixAction} className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangleIcon className="size-4" aria-hidden />
            {formatShortDate(yesterdayOpen.workDate)} の退勤が打刻されていません
          </p>
          <input type="hidden" name="attendanceId" value={yesterdayOpen.id} />
          <input type="hidden" name="projectId" value={yesterdayOpen.projectId ?? ""} />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label htmlFor="fix-out" className="text-xs text-amber-900">
                退勤時刻
              </label>
              <Input id="fix-out" name="clockOutTime" type="time" defaultValue="17:30" required className="num bg-white" />
            </div>
            <div className="space-y-1">
              <label htmlFor="fix-break" className="text-xs text-amber-900">
                休憩
              </label>
              <NativeSelect id="fix-break" name="breakMinutes" defaultValue={String(yesterdayOpen.breakMinutes)} className="[&_select]:bg-white">
                {BREAK_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}分
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <SubmitButton size="lg" variant="outline" className="w-full bg-white" pendingLabel="登録中…">
            前日の退勤を登録
          </SubmitButton>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
        <div className="bg-gradient-to-br from-primary to-[oklch(0.42_0.17_262)] px-5 py-6 text-center text-primary-foreground">
          <p className="text-sm opacity-85">{formatDateWithWeekday(today)}</p>
          <p className="num mt-1 text-5xl font-bold tracking-tight tabular-nums" suppressHydrationWarning aria-live="off">
            {now ? clockFormatter.format(now) : "--:--:--"}
          </p>
        </div>

        <div className="space-y-4 p-4 md:p-5">
          {!record ? (
            <form action={inAction} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="clockin-project" className="text-sm font-medium">
                  今日の現場
                </label>
                <ProjectSelect id="clockin-project" projects={projects} defaultValue={defaultProject} />
              </div>
              <SubmitButton size="xl" className="h-20 w-full rounded-2xl text-xl font-bold [&_svg:not([class*='size-'])]:size-7" pendingLabel="打刻中…">
                <LogInIcon aria-hidden />
                出勤
              </SubmitButton>
            </form>
          ) : !record.clockOut ? (
            <form action={outAction} className="space-y-3">
              <input type="hidden" name="attendanceId" value={record.id} />
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">出勤</p>
                  <p className="num text-2xl font-bold">{formatTime(record.clockIn)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">経過時間</p>
                  <p className="num text-2xl font-bold" suppressHydrationWarning>
                    {elapsed === null ? "--:--" : formatMinutes(elapsed)}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <div className="space-y-1.5">
                  <label htmlFor="clockout-project" className="text-sm font-medium">
                    現場
                  </label>
                  <ProjectSelect id="clockout-project" projects={projects} defaultValue={record.projectId ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="clockout-break" className="text-sm font-medium">
                    休憩
                  </label>
                  <NativeSelect id="clockout-break" name="breakMinutes" defaultValue={String(record.breakMinutes ?? defaultBreakMinutes)} className="[&_select]:h-12 [&_select]:text-base">
                    {BREAK_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}分
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>
              <SubmitButton
                size="xl"
                className="h-20 w-full rounded-2xl bg-slate-900 text-xl font-bold text-white hover:bg-slate-800 [&_svg:not([class*='size-'])]:size-7"
                pendingLabel="打刻中…"
              >
                <LogOutIcon aria-hidden />
                退勤
              </SubmitButton>
            </form>
          ) : (
            <div className="space-y-3 text-center">
              <p className="flex items-center justify-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2Icon className="size-5" aria-hidden />
                本日の勤務は終了しました。お疲れさまでした！
              </p>
              <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-3 sm:grid-cols-4">
                {[
                  ["出勤", formatTime(record.clockIn)],
                  ["退勤", formatTime(record.clockOut)],
                  ["実働", formatMinutes(record.workMinutes)],
                  ["残業", formatMinutes(calcOvertimeMinutes(record.workMinutes, standardWorkMinutes))],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="num text-xl font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
              {record.projectName ? <p className="text-sm text-muted-foreground">現場: {record.projectName}</p> : null}
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">
            打刻時刻はサーバーの時刻で記録されます ・ 所定労働時間 {formatMinutes(standardWorkMinutes)}
          </p>
        </div>
      </section>
    </div>
  );
}
