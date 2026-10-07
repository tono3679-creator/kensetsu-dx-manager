"use client";

import { FormErrorMessage, FormField, SubmitButton, useActionForm, useActionToast } from "@/components/common/form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { updateSettingsAction } from "@/server/actions/settings";
import type { Settings } from "@/server/queries/common";

const WORK_HOURS = [360, 420, 450, 480, 510, 540];
const BREAKS = [0, 30, 45, 60, 75, 90];
const ALERTS = [70, 75, 80, 85, 90, 95, 100];

export function SettingsForm({ settings }: { settings: Settings }) {
  const { state, onSubmit, pending } = useActionForm(updateSettingsAction);
  useActionToast(state);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormErrorMessage state={state} />
      <FormField label="会社名" htmlFor="companyName" required errors={errors.companyName}>
        <Input id="companyName" name="companyName" defaultValue={settings.companyName} maxLength={100} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="所定労働時間（1日）" htmlFor="standardWorkMinutes" errors={errors.standardWorkMinutes} hint="超えた分を残業として集計">
          <NativeSelect id="standardWorkMinutes" name="standardWorkMinutes" defaultValue={String(settings.standardWorkMinutes)}>
            {WORK_HOURS.map((m) => (
              <option key={m} value={m}>
                {Math.floor(m / 60)}時間{m % 60 ? `${m % 60}分` : ""}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="既定の休憩時間" htmlFor="defaultBreakMinutes" errors={errors.defaultBreakMinutes} hint="出勤打刻時の初期値">
          <NativeSelect id="defaultBreakMinutes" name="defaultBreakMinutes" defaultValue={String(settings.defaultBreakMinutes)}>
            {BREAKS.map((m) => (
              <option key={m} value={m}>
                {m}分
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="原価アラート" htmlFor="costAlertPercent" errors={errors.costAlertPercent} hint="予算原価に対するこの割合で警告">
          <NativeSelect id="costAlertPercent" name="costAlertPercent" defaultValue={String(settings.costAlertPercent)}>
            {ALERTS.map((p) => (
              <option key={p} value={p}>
                予算の{p}%
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      <div className="flex justify-end">
        <SubmitButton pending={pending} size="lg">
          設定を保存
        </SubmitButton>
      </div>
    </form>
  );
}
