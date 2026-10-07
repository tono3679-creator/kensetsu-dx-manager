import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { createCustomerAction } from "@/server/actions/customers";
import { requireRole } from "@/server/auth/session";

export const metadata: Metadata = { title: "顧客の登録" };

export default async function NewCustomerPage() {
  await requireRole("admin");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader backHref="/customers" backLabel="顧客一覧" title="顧客の登録" />
      <CustomerForm action={createCustomerAction} submitLabel="登録する" cancelHref="/customers" />
    </div>
  );
}
