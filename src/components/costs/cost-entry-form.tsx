"use client";

import { HammerIcon, PackageIcon, ReceiptIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { FormErrorMessage, FormField, SubmitButton, useActionForm, useActionToast } from "@/components/common/form";
import { YenInput } from "@/components/common/yen-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { COST_TYPE_LABELS, EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
import { formatYen } from "@/lib/format";
import { calcMaterialAmount } from "@/lib/money";
import { cn } from "@/lib/utils";
import { createExpenseAction, createMaterialAction, createOutsourcingAction } from "@/server/actions/costs";
import type { ProjectOption } from "@/server/queries/common";
import { COST_TYPES, EXPENSE_CATEGORIES, type CostType } from "@/types/domain";

const ACTIONS = {
  material: createMaterialAction,
  outsourcing: createOutsourcingAction,
  expense: createExpenseAction,
} as const;

const ICONS = { material: PackageIcon, outsourcing: HammerIcon, expense: ReceiptIcon } as const;
const UNIT_SUGGESTIONS = ["m", "本", "個", "台", "枚", "巻", "缶", "式", "㎡", "箱"];

function MaterialFields({ errors }: { errors: Record<string, string[] | undefined> }) {
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const amount = calcMaterialAmount(quantity || "0", unitPrice.replace(/,/g, "") || "0");

  return (
    <>
      <FormField label="材料名" htmlFor="name" required errors={errors.name} className="sm:col-span-2">
        <Input id="name" name="name" maxLength={100} placeholder="例）VVFケーブル 2.0mm-3C" aria-invalid={!!errors.name} />
      </FormField>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <FormField label="数量" htmlFor="quantity" required errors={errors.quantity}>
          <Input id="quantity" name="quantity" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="num text-right" placeholder="0" aria-invalid={!!errors.quantity} />
        </FormField>
        <FormField label="単位" htmlFor="unit" errors={errors.unit}>
          <Input id="unit" name="unit" list="unit-suggestions" maxLength={10} placeholder="m" />
          <datalist id="unit-suggestions">
            {UNIT_SUGGESTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </FormField>
      </div>
      <FormField label="単価" htmlFor="unitPrice" required errors={errors.unitPrice} hint="小数第2位まで入力できます">
        <div className="relative">
          <Input id="unitPrice" name="unitPrice" inputMode="decimal" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="num pr-8 text-right" placeholder="0" aria-invalid={!!errors.unitPrice} />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">円</span>
        </div>
      </FormField>
      <div className="flex items-center justify-between rounded-xl bg-primary/8 px-4 py-3 sm:col-span-2">
        <span className="text-sm text-muted-foreground">金額（数量 × 単価・円未満四捨五入）</span>
        <span className="num text-xl font-bold text-primary">{amount === null ? "—" : formatYen(amount)}</span>
      </div>
      <FormField label="仕入先" htmlFor="supplier" errors={errors.supplier} className="sm:col-span-2">
        <Input id="supplier" name="supplier" maxLength={100} placeholder="例）株式会社関東電材" />
      </FormField>
    </>
  );
}

function OutsourcingFields({ errors }: { errors: Record<string, string[] | undefined> }) {
  return (
    <>
      <FormField label="外注先" htmlFor="vendorName" required errors={errors.vendorName}>
        <Input id="vendorName" name="vendorName" maxLength={100} placeholder="例）有限会社佐野電気工事" aria-invalid={!!errors.vendorName} />
      </FormField>
      <FormField label="金額" htmlFor="amount" required errors={errors.amount}>
        <YenInput id="amount" name="amount" invalid={!!errors.amount} />
      </FormField>
      <FormField label="作業内容" htmlFor="description" required errors={errors.description} className="sm:col-span-2">
        <Input id="description" name="description" maxLength={200} placeholder="例）幹線ケーブル敷設 応援 2名×3日" aria-invalid={!!errors.description} />
      </FormField>
    </>
  );
}

function ExpenseFields({ errors }: { errors: Record<string, string[] | undefined> }) {
  const [category, setCategory] = useState<string>("parking");
  return (
    <>
      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="text-sm font-medium">費目</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {EXPENSE_CATEGORIES.map((c) => (
            <label
              key={c}
              className={cn(
                "flex h-12 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium transition select-none",
                category === c ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} className="sr-only" />
              {EXPENSE_CATEGORY_LABELS[c]}
            </label>
          ))}
        </div>
        {errors.category ? <p className="text-xs text-red-600">{errors.category[0]}</p> : null}
      </fieldset>
      <FormField label="金額" htmlFor="amount" required errors={errors.amount}>
        <YenInput id="amount" name="amount" invalid={!!errors.amount} />
      </FormField>
    </>
  );
}

export function CostEntryForm({
  projects,
  defaultType,
  defaultProjectId,
  today,
}: {
  projects: ProjectOption[];
  defaultType: CostType;
  defaultProjectId?: string;
  today: string;
}) {
  const [type, setType] = useState<CostType>(defaultType);
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [date, setDate] = useState(today);
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-1" role="tablist" aria-label="原価の種類">
        {COST_TYPES.map((t) => {
          const Icon = ICONS[t];
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={type === t}
              onClick={() => setType(t)}
              className={cn(
                "flex h-12 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition",
                type === t ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {COST_TYPE_LABELS[t]}
            </button>
          );
        })}
      </div>

      <CostForm
        key={`${type}-${resetKey}`}
        type={type}
        projects={projects}
        projectId={projectId}
        onProjectChange={setProjectId}
        date={date}
        onDateChange={setDate}
        today={today}
        onSaved={() => setResetKey((k) => k + 1)}
      />
    </div>
  );
}

function CostForm({
  type,
  projects,
  projectId,
  onProjectChange,
  date,
  onDateChange,
  today,
  onSaved,
}: {
  type: CostType;
  projects: ProjectOption[];
  projectId: string;
  onProjectChange: (id: string) => void;
  date: string;
  onDateChange: (date: string) => void;
  today: string;
  onSaved: () => void;
}) {
  const { state, onSubmit, pending } = useActionForm(ACTIONS[type]);
  useActionToast(state, { onSuccess: onSaved });
  const errors = state.fieldErrors ?? {};
  const dateField = type === "material" ? "purchaseDate" : type === "outsourcing" ? "costDate" : "expenseDate";

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/8 md:p-5" noValidate>
      <FormErrorMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="案件" htmlFor="projectId" required errors={errors.projectId} className="sm:col-span-2">
          <NativeSelect id="projectId" name="projectId" value={projectId} onChange={(e) => onProjectChange(e.target.value)} aria-invalid={!!errors.projectId}>
            <option value="">選択してください</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="日付" htmlFor={dateField} required errors={errors[dateField]}>
          <Input id={dateField} name={dateField} type="date" max={today} value={date} onChange={(e) => onDateChange(e.target.value)} />
        </FormField>
        <div className="hidden sm:block" />
        {type === "material" ? <MaterialFields errors={errors} /> : null}
        {type === "outsourcing" ? <OutsourcingFields errors={errors} /> : null}
        {type === "expense" ? <ExpenseFields errors={errors} /> : null}
        <FormField label="メモ" htmlFor="memo" errors={errors.memo} className="sm:col-span-2">
          <Input id="memo" name="memo" maxLength={500} placeholder="任意" />
        </FormField>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="xl" className="sm:h-10 sm:text-sm">
          <Link href={projectId ? `/projects/${projectId}?tab=${type === "material" ? "materials" : type === "outsourcing" ? "outsourcing" : "expenses"}` : "/costs"}>
            登録済みの明細を見る
          </Link>
        </Button>
        <SubmitButton pending={pending} size="xl" className="sm:h-10 sm:px-8 sm:text-sm" pendingLabel="登録中…">
          {COST_TYPE_LABELS[type]}を登録
        </SubmitButton>
      </div>
      <p className="text-center text-xs text-muted-foreground sm:text-right">登録後はそのまま続けて入力できます（案件・日付は保持されます）</p>
    </form>
  );
}
