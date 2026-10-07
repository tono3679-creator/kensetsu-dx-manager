import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ConfirmActionButton } from "@/components/common/confirm-action-button";
import { PageHeader } from "@/components/common/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { isUuid } from "@/lib/search-params";
import { deleteProjectAction, updateProjectAction } from "@/server/actions/projects";
import { withUser } from "@/server/auth/session";
import { listEmployeeOptions } from "@/server/queries/common";
import { listCustomerChoices } from "@/server/queries/form-options";
import { getProjectFormValues } from "@/server/queries/projects";

export const metadata: Metadata = { title: "案件の編集" };

export default async function EditProjectPage(props: PageProps<"/projects/[id]/edit">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const data = await withUser(
    async (db) => {
      const project = await getProjectFormValues(db, id);
      if (!project) return null;
      return { project, customers: await listCustomerChoices(db), employees: await listEmployeeOptions(db) };
    },
    { roles: ["admin"] },
  );
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        backHref={`/projects/${id}`}
        backLabel="案件詳細"
        title="案件の編集"
        description={data.project.name}
        actions={
          <ConfirmActionButton
            action={deleteProjectAction.bind(null, id)}
            title="この案件を削除しますか？"
            description="紐づく日報・材料費・外注費・経費・写真もすべて削除されます。勤怠記録は残りますが案件との紐付けが解除されます。この操作は元に戻せません。"
          />
        }
      />
      <ProjectForm
        action={updateProjectAction.bind(null, id)}
        customers={data.customers}
        employees={data.employees}
        initial={data.project}
        submitLabel="変更を保存"
        cancelHref={`/projects/${id}`}
      />
    </div>
  );
}
