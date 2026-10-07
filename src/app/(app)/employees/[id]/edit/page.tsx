import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { EmployeeForm } from "@/components/employees/employee-form";
import { isUuid } from "@/lib/search-params";
import { updateEmployeeAction } from "@/server/actions/employees";
import { withUser } from "@/server/auth/session";
import { listDepartments } from "@/server/queries/common";
import { getEmployee } from "@/server/queries/employees";

export const metadata: Metadata = { title: "従業員の編集" };

export default async function EditEmployeePage(props: PageProps<"/employees/[id]/edit">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const data = await withUser(
    async (db) => {
      const employee = await getEmployee(db, id);
      return employee ? { employee, departments: await listDepartments(db) } : null;
    },
    { roles: ["admin"] },
  );
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader backHref={`/employees/${id}`} backLabel="従業員詳細" title="従業員の編集" description={data.employee.name} />
      <EmployeeForm
        action={updateEmployeeAction.bind(null, id)}
        departments={data.departments}
        initial={data.employee}
        submitLabel="変更を保存"
        cancelHref={`/employees/${id}`}
      />
    </div>
  );
}
