"use client";

import Link from "next/link";

import { FormErrorMessage, FormField, SubmitButton, useActionForm } from "@/components/common/form";
import { YenInput } from "@/components/common/yen-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EMPLOYMENT_STATUS_LABELS, ROLE_LABELS } from "@/lib/constants";
import type { ActionResult } from "@/lib/validation/common";
import type { DepartmentOption } from "@/server/queries/common";
import type { EmployeeDetail } from "@/server/queries/employees";
import { APP_ROLES, EMPLOYMENT_STATUSES } from "@/types/domain";

const ROLE_HINTS = {
  admin: "全データの閲覧・編集、経営ダッシュボード",
  manager: "担当案件・日報・作業員の確認、材料費・経費の登録",
  staff: "自分の勤怠、担当現場の確認、日報の登録",
} as const;

export function EmployeeForm({
  action,
  departments,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  departments: DepartmentOption[];
  initial?: EmployeeDetail;
  submitLabel: string;
  cancelHref: string;
}) {
  const { state, onSubmit, pending } = useActionForm(action);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormErrorMessage state={state} />
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          {initial ? <CardDescription>従業員ID: {initial.employeeCode}</CardDescription> : <CardDescription>従業員IDは自動で採番されます</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="姓" htmlFor="lastName" required errors={errors.lastName}>
            <Input id="lastName" name="lastName" defaultValue={initial?.lastName} maxLength={30} autoComplete="family-name" aria-invalid={!!errors.lastName} />
          </FormField>
          <FormField label="名" htmlFor="firstName" required errors={errors.firstName}>
            <Input id="firstName" name="firstName" defaultValue={initial?.firstName} maxLength={30} autoComplete="given-name" aria-invalid={!!errors.firstName} />
          </FormField>
          <FormField label="せい（ふりがな）" htmlFor="lastNameKana" errors={errors.lastNameKana}>
            <Input id="lastNameKana" name="lastNameKana" defaultValue={initial?.lastNameKana ?? ""} maxLength={30} />
          </FormField>
          <FormField label="めい（ふりがな）" htmlFor="firstNameKana" errors={errors.firstNameKana}>
            <Input id="firstNameKana" name="firstNameKana" defaultValue={initial?.firstNameKana ?? ""} maxLength={30} />
          </FormField>
          <FormField label="メールアドレス" htmlFor="email" required errors={errors.email}>
            <Input id="email" name="email" type="email" inputMode="email" defaultValue={initial?.email} maxLength={254} aria-invalid={!!errors.email} />
          </FormField>
          <FormField label="電話番号" htmlFor="phone" errors={errors.phone}>
            <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={initial?.phone ?? ""} placeholder="090-1234-5678" />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>所属・権限・原価</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="所属" htmlFor="departmentId" errors={errors.departmentId}>
            <NativeSelect id="departmentId" name="departmentId" defaultValue={initial?.departmentId ?? ""}>
              <option value="">未設定</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="役職" htmlFor="position" errors={errors.position}>
            <Input id="position" name="position" defaultValue={initial?.position ?? ""} maxLength={30} placeholder="例）主任、電気工事士" />
          </FormField>
          <FormField label="権限" htmlFor="role" required errors={errors.role} hint="権限に応じて閲覧・操作できる範囲が変わります">
            <NativeSelect id="role" name="role" defaultValue={initial?.role ?? "staff"}>
              {APP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}（{ROLE_HINTS[r]}）
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="時間原価（1時間あたり社内原価）" htmlFor="hourlyCost" required errors={errors.hourlyCost} hint="勤怠の実働時間 × 時間原価 が案件の労務費になります">
            <YenInput id="hourlyCost" name="hourlyCost" defaultValue={initial?.hourlyCost ?? 2500} invalid={!!errors.hourlyCost} />
          </FormField>
          <FormField label="入社日" htmlFor="hireDate" errors={errors.hireDate}>
            <Input id="hireDate" name="hireDate" type="date" defaultValue={initial?.hireDate ?? ""} />
          </FormField>
          <FormField label="在籍状況" htmlFor="employmentStatus" required errors={errors.employmentStatus} hint="退職にするとログインできなくなります">
            <NativeSelect id="employmentStatus" name="employmentStatus" defaultValue={initial?.employmentStatus ?? "active"}>
              {EMPLOYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {EMPLOYMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </CardContent>
      </Card>

      <div className="flex gap-2 md:justify-end">
        <Button asChild variant="outline" size="xl" className="flex-1 md:h-10 md:flex-none md:text-sm">
          <Link href={cancelHref}>キャンセル</Link>
        </Button>
        <SubmitButton pending={pending} size="xl" className="flex-1 md:h-10 md:flex-none md:px-8 md:text-sm">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
