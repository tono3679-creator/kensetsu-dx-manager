"use server";

import { revalidatePath } from "next/cache";

import { COST_TYPE_LABELS } from "@/lib/constants";
import { formatYen } from "@/lib/format";
import { calcMaterialAmount } from "@/lib/money";
import { formDataToObject, validationFailed, type ActionResult } from "@/lib/validation/common";
import { expenseSchema, materialSchema, outsourcingSchema } from "@/lib/validation/cost";
import { COST_TYPES, type AppRole, type CostType } from "@/types/domain";

import { withUser } from "../auth/session";
import { NotFoundError, sql } from "../db";
import { toActionError } from "./helpers";

const COST_ROLES: AppRole[] = ["admin", "manager"];

function revalidateCostPages(projectId: string) {
  revalidatePath("/costs");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function createMaterialAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = materialSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;
  try {
    await withUser(
      (db, user) =>
        db.execute(sql`
          insert into public.materials (project_id, purchase_date, name, quantity, unit, unit_price, supplier, memo, created_by)
          values (${input.projectId}, ${input.purchaseDate}, ${input.name}, ${input.quantity}, ${input.unit},
                  ${input.unitPrice}, ${input.supplier}, ${input.memo}, ${user.employeeId})
        `),
      { roles: COST_ROLES },
    );
  } catch (error) {
    return toActionError(error);
  }
  revalidateCostPages(input.projectId);
  const amount = calcMaterialAmount(input.quantity, input.unitPrice);
  return { ok: true, message: `材料費「${input.name}」${formatYen(amount)} を登録しました` };
}

export async function createOutsourcingAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = outsourcingSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;
  try {
    await withUser(
      (db, user) =>
        db.execute(sql`
          insert into public.outsourcing_costs (project_id, cost_date, vendor_name, description, amount, memo, created_by)
          values (${input.projectId}, ${input.costDate}, ${input.vendorName}, ${input.description}, ${input.amount},
                  ${input.memo}, ${user.employeeId})
        `),
      { roles: COST_ROLES },
    );
  } catch (error) {
    return toActionError(error);
  }
  revalidateCostPages(input.projectId);
  return { ok: true, message: `外注費「${input.vendorName}」${formatYen(input.amount)} を登録しました` };
}

export async function createExpenseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;
  try {
    await withUser(
      (db, user) =>
        db.execute(sql`
          insert into public.expenses (project_id, expense_date, category, amount, memo, created_by)
          values (${input.projectId}, ${input.expenseDate}, ${input.category}, ${input.amount}, ${input.memo}, ${user.employeeId})
        `),
      { roles: COST_ROLES },
    );
  } catch (error) {
    return toActionError(error);
  }
  revalidateCostPages(input.projectId);
  return { ok: true, message: `経費 ${formatYen(input.amount)} を登録しました` };
}

const COST_TABLES: Record<CostType, string> = {
  material: "public.materials",
  outsourcing: "public.outsourcing_costs",
  expense: "public.expenses",
};

export async function deleteCostEntryAction(type: CostType, id: string): Promise<ActionResult> {
  if (!COST_TYPES.includes(type)) return { ok: false, message: "不正なリクエストです" };
  let projectId: string;
  try {
    projectId = await withUser(
      async (db) => {
        // テーブル名は固定の対応表からのみ選択
        const row = await db.maybeOne<{ projectId: string }>(
          sql`delete from ${sql.raw(COST_TABLES[type])} where id = ${id} returning project_id`,
        );
        if (!row) throw new NotFoundError();
        return row.projectId;
      },
      { roles: COST_ROLES },
    );
  } catch (error) {
    return toActionError(error);
  }
  revalidateCostPages(projectId);
  return { ok: true, message: `${COST_TYPE_LABELS[type]}を削除しました` };
}
