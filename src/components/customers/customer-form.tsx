"use client";

import Link from "next/link";

import { FormErrorMessage, FormField, SubmitButton, useActionForm } from "@/components/common/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/validation/common";
import type { CustomerDetail } from "@/server/queries/customers";

export function CustomerForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  initial?: CustomerDetail;
  submitLabel: string;
  cancelHref: string;
}) {
  const { state, onSubmit, pending } = useActionForm(action);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormErrorMessage state={state} />
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="顧客名" htmlFor="name" required errors={errors.name} hint="一覧や案件で表示される名称です（例: さくら内科クリニック、佐藤 健一 様）">
            <Input id="name" name="name" defaultValue={initial?.name} maxLength={100} aria-invalid={!!errors.name} />
          </FormField>
          <FormField label="法人名" htmlFor="corporateName" errors={errors.corporateName} hint="個人のお客様は空欄">
            <Input id="corporateName" name="corporateName" defaultValue={initial?.corporateName ?? ""} maxLength={100} placeholder="例）医療法人さくら会" />
          </FormField>
          <FormField label="担当者" htmlFor="contactPerson" errors={errors.contactPerson}>
            <Input id="contactPerson" name="contactPerson" defaultValue={initial?.contactPerson ?? ""} maxLength={50} />
          </FormField>
          <FormField label="電話番号" htmlFor="phone" errors={errors.phone}>
            <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={initial?.phone ?? ""} placeholder="03-1234-5678" />
          </FormField>
          <FormField label="メールアドレス" htmlFor="email" errors={errors.email} className="sm:col-span-2">
            <Input id="email" name="email" type="email" inputMode="email" defaultValue={initial?.email ?? ""} />
          </FormField>
          <FormField label="郵便番号" htmlFor="postalCode" errors={errors.postalCode}>
            <Input id="postalCode" name="postalCode" inputMode="numeric" defaultValue={initial?.postalCode ?? ""} placeholder="123-4567" className="num" />
          </FormField>
          <FormField label="住所" htmlFor="address" errors={errors.address} className="sm:col-span-2">
            <Input id="address" name="address" defaultValue={initial?.address ?? ""} maxLength={200} />
          </FormField>
          <FormField label="メモ" htmlFor="memo" errors={errors.memo} className="sm:col-span-2">
            <Textarea id="memo" name="memo" defaultValue={initial?.memo ?? ""} rows={4} maxLength={2000} placeholder="作業時の注意事項、請求先の情報など" />
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
