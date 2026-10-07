"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { FormErrorMessage, FormField, SubmitButton, useActionForm, useActionToast } from "@/components/common/form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatTime } from "@/lib/format";
import { saveAttendanceAction } from "@/server/actions/attendance";
import type { AttendanceRecord } from "@/server/queries/attendance";
import type { ProjectOption } from "@/server/queries/common";

const BREAK_OPTIONS = [0, 30, 45, 60, 75, 90, 120];

function EditForm({
  record,
  employeeId,
  defaultDate,
  projects,
  onDone,
}: {
  record: AttendanceRecord | null;
  employeeId: string;
  defaultDate: string;
  projects: ProjectOption[];
  onDone: () => void;
}) {
  const { state, onSubmit, pending } = useActionForm(saveAttendanceAction.bind(null, record?.id ?? null));
  useActionToast(state, { onSuccess: onDone });
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormErrorMessage state={state} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <FormField label="日付" htmlFor="att-date" required errors={errors.workDate}>
        <Input id="att-date" name="workDate" type="date" defaultValue={record?.workDate ?? defaultDate} />
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="出勤" htmlFor="att-in" required errors={errors.clockInTime}>
          <Input id="att-in" name="clockInTime" type="time" defaultValue={record ? formatTime(record.clockIn) : "08:00"} className="num" />
        </FormField>
        <FormField label="退勤" htmlFor="att-out" errors={errors.clockOutTime}>
          <Input id="att-out" name="clockOutTime" type="time" defaultValue={record?.clockOut ? formatTime(record.clockOut) : ""} className="num" />
        </FormField>
        <FormField label="休憩" htmlFor="att-break" errors={errors.breakMinutes}>
          <NativeSelect id="att-break" name="breakMinutes" defaultValue={String(record?.breakMinutes ?? 60)}>
            {BREAK_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}分
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      <FormField label="現場（案件）" htmlFor="att-project" errors={errors.projectId}>
        <NativeSelect id="att-project" name="projectId" defaultValue={record?.projectId ?? ""}>
          <option value="">現場なし（社内作業）</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="メモ（修正理由など）" htmlFor="att-note" errors={errors.note}>
        <Input id="att-note" name="note" defaultValue={record?.note ?? ""} maxLength={500} />
      </FormField>
      <SubmitButton pending={pending} size="lg" className="w-full">
        {record ? "修正を保存" : "勤怠を登録"}
      </SubmitButton>
    </form>
  );
}

export function AttendanceEditDialog({
  record,
  employeeId,
  defaultDate,
  projects,
}: {
  record: AttendanceRecord | null;
  employeeId: string;
  defaultDate: string;
  projects: ProjectOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {record ? (
          <Button variant="ghost" size="sm" aria-label="勤怠を修正">
            <PencilIcon aria-hidden />
            修正
          </Button>
        ) : (
          <Button variant="outline" size="lg">
            <PlusIcon aria-hidden />
            勤怠を追加
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{record ? "勤怠の修正" : "勤怠の追加"}</DialogTitle>
          <DialogDescription>実働時間・残業時間・労務費は保存時に自動で再計算されます。</DialogDescription>
        </DialogHeader>
        {open ? (
          <EditForm record={record} employeeId={employeeId} defaultDate={defaultDate} projects={projects} onDone={() => setOpen(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
