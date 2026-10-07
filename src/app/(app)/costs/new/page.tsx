import { Building2Icon } from "lucide-react";
import type { Metadata } from "next";

import { CostEntryForm } from "@/components/costs/cost-entry-form";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { todayJst } from "@/lib/date";
import { enumParam, uuidParam } from "@/lib/search-params";
import { withUser } from "@/server/auth/session";
import { listProjectOptions } from "@/server/queries/common";
import { COST_TYPES } from "@/types/domain";

export const metadata: Metadata = { title: "原価の登録" };

export default async function NewCostPage(props: PageProps<"/costs/new">) {
  const sp = await props.searchParams;
  const projects = await withUser((db) => listProjectOptions(db, { activeOnly: true }), { roles: ["admin", "manager"] });
  const requestedProject = uuidParam(sp, "projectId");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        backHref="/costs"
        backLabel="原価管理"
        title="材料費・外注費・経費の登録"
        description="登録した金額は案件の実績原価に即時反映され、利益率が自動で再計算されます。"
      />
      {projects.length === 0 ? (
        <EmptyState icon={Building2Icon} title="登録できる案件がありません" description="担当の案件が割り当てられると登録できるようになります。" />
      ) : (
        <CostEntryForm
          projects={projects}
          defaultType={enumParam(sp, "type", COST_TYPES) ?? "material"}
          defaultProjectId={projects.some((p) => p.id === requestedProject) ? requestedProject : undefined}
          today={todayJst()}
        />
      )}
    </div>
  );
}
