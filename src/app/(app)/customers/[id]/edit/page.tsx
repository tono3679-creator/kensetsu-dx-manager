import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { isUuid } from "@/lib/search-params";
import { updateCustomerAction } from "@/server/actions/customers";
import { withUser } from "@/server/auth/session";
import { getCustomer } from "@/server/queries/customers";

export const metadata: Metadata = { title: "顧客の編集" };

export default async function EditCustomerPage(props: PageProps<"/customers/[id]/edit">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const customer = await withUser((db) => getCustomer(db, id), { roles: ["admin"] });
  if (!customer) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader backHref={`/customers/${id}`} backLabel="顧客詳細" title="顧客の編集" description={customer.name} />
      <CustomerForm action={updateCustomerAction.bind(null, id)} initial={customer} submitLabel="変更を保存" cancelHref={`/customers/${id}`} />
    </div>
  );
}
