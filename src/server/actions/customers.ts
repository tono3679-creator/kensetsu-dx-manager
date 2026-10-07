"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isUuid } from "@/lib/search-params";
import { formDataToObject, validationFailed, type ActionResult } from "@/lib/validation/common";
import { customerSchema } from "@/lib/validation/master";

import { withUser } from "../auth/session";
import { NotFoundError, sql } from "../db";
import { setFlash, toActionError } from "./helpers";

export async function createCustomerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const v = parsed.data;
  let id: string;
  try {
    id = await withUser(
      async (db) =>
        (
          await db.one<{ id: string }>(sql`
            insert into public.customers (name, corporate_name, contact_person, phone, email, postal_code, address, memo)
            values (${v.name}, ${v.corporateName}, ${v.contactPerson}, ${v.phone}, ${v.email}, ${v.postalCode}, ${v.address}, ${v.memo})
            returning id
          `)
        ).id,
      { roles: ["admin"] },
    );
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/customers");
  await setFlash("顧客を登録しました");
  redirect(`/customers/${id}`);
}

export async function updateCustomerAction(customerId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const v = parsed.data;
  try {
    await withUser(
      async (db) => {
        const updated = await db.execute(sql`
          update public.customers set
            name = ${v.name}, corporate_name = ${v.corporateName}, contact_person = ${v.contactPerson}, phone = ${v.phone},
            email = ${v.email}, postal_code = ${v.postalCode}, address = ${v.address}, memo = ${v.memo}
          where id = ${customerId}
        `);
        if (updated === 0) throw new NotFoundError();
      },
      { roles: ["admin"] },
    );
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  await setFlash("顧客情報を更新しました");
  redirect(`/customers/${customerId}`);
}

export async function deleteCustomerAction(customerId: string): Promise<ActionResult> {
  if (!isUuid(customerId)) return { ok: false, message: "不正なリクエストです" };
  try {
    await withUser(
      async (db) => {
        const projects = await db.one<{ count: number }>(sql`
          select count(*)::int as count from public.projects where customer_id = ${customerId}
        `);
        if (projects.count > 0) throw Object.assign(new Error("has projects"), { code: "HAS_PROJECTS" });
        const deleted = await db.execute(sql`delete from public.customers where id = ${customerId}`);
        if (deleted === 0) throw new NotFoundError();
      },
      { roles: ["admin"] },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "HAS_PROJECTS") {
      return { ok: false, message: "案件が登録されている顧客は削除できません" };
    }
    return toActionError(error);
  }
  revalidatePath("/customers");
  await setFlash("顧客を削除しました");
  redirect("/customers");
}
