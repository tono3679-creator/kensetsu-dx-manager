"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { todayJst } from "@/lib/date";
import { formDataToObject, validationFailed, type ActionResult } from "@/lib/validation/common";
import { projectSchema, type ProjectInput } from "@/lib/validation/project";

import { withUser } from "../auth/session";
import { NotFoundError, sql, type Db } from "../db";
import { setFlash, toActionError } from "./helpers";

/** 工事中・完工への変更時に実績日が空なら今日を補完する */
function normalizeDates(input: ProjectInput): ProjectInput {
  const today = todayJst();
  const started = ["in_progress", "completed", "invoiced", "paid"].includes(input.status);
  const done = ["completed", "invoiced", "paid"].includes(input.status);
  return {
    ...input,
    actualStartDate: started ? (input.actualStartDate ?? today) : input.actualStartDate,
    actualEndDate: done ? (input.actualEndDate ?? today) : input.actualEndDate,
  };
}

async function replaceMembers(db: Db, projectId: string, memberIds: string[], siteManagerId: string | null) {
  await db.execute(sql`delete from public.project_members where project_id = ${projectId}`);
  const ids = [...new Set(memberIds)].filter((id) => id !== siteManagerId);
  if (ids.length === 0) return;
  await db.execute(sql`
    insert into public.project_members (project_id, employee_id)
    values ${sql.join(ids.map((id) => sql`(${projectId}, ${id})`))}
  `);
}

export async function createProjectAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(formDataToObject(formData, ["memberIds"]));
  if (!parsed.success) return validationFailed(parsed.error);
  const input = normalizeDates(parsed.data);

  let projectId: string;
  try {
    projectId = await withUser(
      async (db) => {
        const { id } = await db.one<{ id: string }>(sql`
          insert into public.projects (
            name, customer_id, site_address, construction_type, sales_rep_id, site_manager_id,
            contract_amount, estimate_amount, budget_cost, contract_date,
            planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, memo
          ) values (
            ${input.name}, ${input.customerId}, ${input.siteAddress}, ${input.constructionType}, ${input.salesRepId},
            ${input.siteManagerId}, ${input.contractAmount}, ${input.estimateAmount}, ${input.budgetCost},
            ${input.contractDate}, ${input.plannedStartDate}, ${input.plannedEndDate}, ${input.actualStartDate},
            ${input.actualEndDate}, ${input.status}, ${input.memo}
          )
          returning id
        `);
        await replaceMembers(db, id, input.memberIds, input.siteManagerId);
        return id;
      },
      { roles: ["admin"] },
    );
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath("/", "layout");
  await setFlash("案件を登録しました");
  redirect(`/projects/${projectId}`);
}

export async function updateProjectAction(
  projectId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(formDataToObject(formData, ["memberIds"]));
  if (!parsed.success) return validationFailed(parsed.error);
  const input = normalizeDates(parsed.data);

  try {
    await withUser(
      async (db) => {
        const updated = await db.execute(sql`
          update public.projects set
            name = ${input.name}, customer_id = ${input.customerId}, site_address = ${input.siteAddress},
            construction_type = ${input.constructionType}, sales_rep_id = ${input.salesRepId},
            site_manager_id = ${input.siteManagerId}, contract_amount = ${input.contractAmount},
            estimate_amount = ${input.estimateAmount}, budget_cost = ${input.budgetCost},
            contract_date = ${input.contractDate}, planned_start_date = ${input.plannedStartDate},
            planned_end_date = ${input.plannedEndDate}, actual_start_date = ${input.actualStartDate},
            actual_end_date = ${input.actualEndDate}, status = ${input.status}, memo = ${input.memo}
          where id = ${projectId}
        `);
        if (updated === 0) throw new NotFoundError();
        await replaceMembers(db, projectId, input.memberIds, input.siteManagerId);
      },
      { roles: ["admin"] },
    );
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath("/", "layout");
  await setFlash("案件を更新しました");
  redirect(`/projects/${projectId}`);
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  try {
    await withUser(
      async (db) => {
        const deleted = await db.execute(sql`delete from public.projects where id = ${projectId}`);
        if (deleted === 0) throw new NotFoundError();
      },
      { roles: ["admin"] },
    );
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/", "layout");
  await setFlash("案件を削除しました");
  redirect("/projects");
}
