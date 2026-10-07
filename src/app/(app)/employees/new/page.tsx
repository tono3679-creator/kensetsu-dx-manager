import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { EmployeeForm } from "@/components/employees/employee-form";
import { createEmployeeAction } from "@/server/actions/employees";
import { withUser } from "@/server/auth/session";
import { listDepartments } from "@/server/queries/common";

export const metadata: Metadata = { title: "従業員の登録" };

export default async function NewEmployeePage() {
  const departments = await withUser((db) => listDepartments(db), { roles: ["admin"] });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader backHref="/employees" backLabel="従業員一覧" title="従業員の登録" />
      <EmployeeForm action={createEmployeeAction} departments={departments} submitLabel="登録する" cancelHref="/employees" />
    </div>
  );
}
