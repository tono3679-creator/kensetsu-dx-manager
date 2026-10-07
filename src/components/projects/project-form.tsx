"use client";

import { CopyIcon } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { FormErrorMessage, FormField, SubmitButton, useActionForm } from "@/components/common/form";
import { YenInput } from "@/components/common/yen-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CONSTRUCTION_TYPE_LABELS, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { formatPercent, formatYen } from "@/lib/format";
import { calcProfitRate } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/validation/common";
import type { EmployeeOption } from "@/server/queries/common";
import type { ProjectFormValues } from "@/server/queries/projects";
import { CONSTRUCTION_TYPES, PROJECT_STATUSES } from "@/types/domain";

interface CustomerChoice {
  id: string;
  name: string;
  address: string | null;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

export function ProjectForm({
  action,
  customers,
  employees,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  customers: CustomerChoice[];
  employees: EmployeeOption[];
  initial?: ProjectFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const { state, onSubmit, pending } = useActionForm(action);
  const errors = state.fieldErrors ?? {};
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [siteAddress, setSiteAddress] = useState(initial?.siteAddress ?? "");
  const [contract, setContract] = useState<number | null>(initial?.contractAmount ?? null);
  const [budget, setBudget] = useState<number | null>(initial?.budgetCost ?? null);
  const [memberIds, setMemberIds] = useState<string[]>(initial?.memberIds ?? []);
  const [siteManagerId, setSiteManagerId] = useState(initial?.siteManagerId ?? "");

  const customerAddress = customers.find((c) => c.id === customerId)?.address ?? null;
  const plannedProfit = contract !== null && budget !== null ? contract - budget : null;
  const plannedRate = contract !== null && budget !== null ? calcProfitRate(contract, budget) : null;
  const fieldWorkers = employees.filter((e) => e.id !== siteManagerId);

  const toggleMember = (id: string) =>
    setMemberIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormErrorMessage state={state} />

      <Section title="基本情報">
        <FormField label="案件名" htmlFor="name" required errors={errors.name} className="sm:col-span-2">
          <Input id="name" name="name" defaultValue={initial?.name} placeholder="例）○○ビル 空調設備更新工事" maxLength={200} aria-invalid={!!errors.name} />
        </FormField>
        <FormField label="顧客" htmlFor="customerId" required errors={errors.customerId}>
          <NativeSelect id="customerId" name="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} aria-invalid={!!errors.customerId}>
            <option value="">選択してください</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="工事種別" htmlFor="constructionType" required errors={errors.constructionType}>
          <NativeSelect id="constructionType" name="constructionType" defaultValue={initial?.constructionType ?? ""} aria-invalid={!!errors.constructionType}>
            <option value="">選択してください</option>
            {CONSTRUCTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONSTRUCTION_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="現場住所" htmlFor="siteAddress" errors={errors.siteAddress} className="sm:col-span-2">
          <div className="flex gap-2">
            <Input id="siteAddress" name="siteAddress" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} maxLength={200} placeholder="例）東京都大田区…" />
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="shrink-0 md:h-9"
              disabled={!customerAddress}
              onClick={() => customerAddress && setSiteAddress(customerAddress)}
            >
              <CopyIcon aria-hidden />
              顧客住所
            </Button>
          </div>
        </FormField>
        <FormField label="ステータス" htmlFor="status" required errors={errors.status}>
          <NativeSelect id="status" name="status" defaultValue={initial?.status ?? "estimating"}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        {initial ? (
          <FormField label="案件ID" htmlFor="projectCode" hint="案件IDは自動採番されます">
            <Input id="projectCode" value={initial.projectCode} readOnly disabled className="num" />
          </FormField>
        ) : null}
      </Section>

      <Section title="担当" description="現場責任者と作業員は、日報・勤怠でこの案件を選べるようになります。">
        <FormField label="担当者（営業）" htmlFor="salesRepId" errors={errors.salesRepId}>
          <NativeSelect id="salesRepId" name="salesRepId" defaultValue={initial?.salesRepId ?? ""}>
            <option value="">未設定</option>
            {employees
              .filter((e) => e.role !== "staff")
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </NativeSelect>
        </FormField>
        <FormField label="現場責任者" htmlFor="siteManagerId" errors={errors.siteManagerId}>
          <NativeSelect id="siteManagerId" name="siteManagerId" value={siteManagerId} onChange={(e) => setSiteManagerId(e.target.value)}>
            <option value="">未設定</option>
            {employees
              .filter((e) => e.role !== "staff")
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </NativeSelect>
        </FormField>
        <fieldset className="space-y-2 sm:col-span-2">
          <legend className="text-sm font-medium">作業員</legend>
          <div className="flex flex-wrap gap-2">
            {fieldWorkers.map((e) => {
              const checked = memberIds.includes(e.id);
              return (
                <label
                  key={e.id}
                  className={cn(
                    "flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition select-none",
                    checked ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted",
                  )}
                >
                  <input type="checkbox" name="memberIds" value={e.id} checked={checked} onChange={() => toggleMember(e.id)} className="sr-only" />
                  {e.name}
                  {e.departmentName ? <span className="text-xs text-muted-foreground">{e.departmentName.replace(/（.*）/, "")}</span> : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      </Section>

      <Section title="金額" description="金額は税抜・円単位で入力してください。">
        <FormField label="見積金額" htmlFor="estimateAmount" errors={errors.estimateAmount}>
          <YenInput id="estimateAmount" name="estimateAmount" defaultValue={initial?.estimateAmount} invalid={!!errors.estimateAmount} />
        </FormField>
        <FormField label="受注金額" htmlFor="contractAmount" errors={errors.contractAmount} hint="受注以降のステータスでは必須です">
          <YenInput id="contractAmount" name="contractAmount" defaultValue={initial?.contractAmount} onValueChange={setContract} invalid={!!errors.contractAmount} />
        </FormField>
        <FormField label="予算原価" htmlFor="budgetCost" errors={errors.budgetCost} hint="実行予算。原価アラートの基準になります">
          <YenInput id="budgetCost" name="budgetCost" defaultValue={initial?.budgetCost} onValueChange={setBudget} invalid={!!errors.budgetCost} />
        </FormField>
        <div className="flex flex-col justify-end rounded-lg bg-muted/60 px-4 py-3">
          <p className="text-xs text-muted-foreground">予定粗利益（受注金額 − 予算原価）</p>
          <p className="num text-lg font-bold">
            {formatYen(plannedProfit)}
            <span className="ml-2 text-sm font-medium text-muted-foreground">予定利益率 {formatPercent(plannedRate)}</span>
          </p>
        </div>
      </Section>

      <Section title="日程">
        <FormField label="契約日" htmlFor="contractDate" errors={errors.contractDate}>
          <Input id="contractDate" name="contractDate" type="date" defaultValue={initial?.contractDate ?? ""} />
        </FormField>
        <div className="hidden sm:block" />
        <FormField label="着工予定日" htmlFor="plannedStartDate" errors={errors.plannedStartDate}>
          <Input id="plannedStartDate" name="plannedStartDate" type="date" defaultValue={initial?.plannedStartDate ?? ""} />
        </FormField>
        <FormField label="完工予定日" htmlFor="plannedEndDate" errors={errors.plannedEndDate}>
          <Input id="plannedEndDate" name="plannedEndDate" type="date" defaultValue={initial?.plannedEndDate ?? ""} aria-invalid={!!errors.plannedEndDate} />
        </FormField>
        <FormField label="実際の着工日" htmlFor="actualStartDate" errors={errors.actualStartDate} hint="「工事中」にすると未入力の場合は今日が入ります">
          <Input id="actualStartDate" name="actualStartDate" type="date" defaultValue={initial?.actualStartDate ?? ""} />
        </FormField>
        <FormField label="実際の完工日" htmlFor="actualEndDate" errors={errors.actualEndDate} hint="売上は完工日の月に計上されます">
          <Input id="actualEndDate" name="actualEndDate" type="date" defaultValue={initial?.actualEndDate ?? ""} aria-invalid={!!errors.actualEndDate} />
        </FormField>
      </Section>

      <Card>
        <CardContent>
          <FormField label="メモ" htmlFor="memo" errors={errors.memo}>
            <Textarea id="memo" name="memo" defaultValue={initial?.memo ?? ""} rows={4} maxLength={4000} placeholder="現場の注意事項、施主の要望など" />
          </FormField>
        </CardContent>
      </Card>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:justify-end md:border-0 md:bg-transparent md:p-0">
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
