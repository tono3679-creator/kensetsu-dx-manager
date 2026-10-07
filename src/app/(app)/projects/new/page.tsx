import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { createProjectAction } from "@/server/actions/projects";
import { withUser } from "@/server/auth/session";
import { listEmployeeOptions } from "@/server/queries/common";
import { listCustomerChoices } from "@/server/queries/form-options";

export const metadata: Metadata = { title: "案件の登録" };

export default async function NewProjectPage() {
  const { customers, employees } = await withUser(
    async (db) => ({ customers: await listCustomerChoices(db), employees: await listEmployeeOptions(db) }),
    { roles: ["admin"] },
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader backHref="/projects" backLabel="案件一覧" title="案件の登録" description="案件IDは登録時に自動で採番されます。" />
      <ProjectForm action={createProjectAction} customers={customers} employees={employees} submitLabel="登録する" cancelHref="/projects" />
    </div>
  );
}
