"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { formDataToObject, validationFailed, type ActionResult } from "@/lib/validation/common";
import { employeeSchema } from "@/lib/validation/master";

import { withUser } from "../auth/session";
import { NotFoundError, sql } from "../db";
import { setFlash, toActionError } from "./helpers";

export async function createEmployeeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const v = parsed.data;

  let id: string;
  try {
    id = await withUser(
      async (db) => {
        const row = await db.one<{ id: string }>(sql`
          insert into public.employees
            (last_name, first_name, last_name_kana, first_name_kana, email, phone, department_id, position, role, hire_date, employment_status)
          values
            (${v.lastName}, ${v.firstName}, ${v.lastNameKana}, ${v.firstNameKana}, ${v.email}, ${v.phone}, ${v.departmentId},
             ${v.position}, ${v.role}, ${v.hireDate}, ${v.employmentStatus})
          returning id
        `);
        await db.execute(sql`insert into public.employee_cost_rates (employee_id, hourly_cost) values (${row.id}, ${v.hourlyCost})`);
        return row.id;
      },
      { roles: ["admin"] },
    );
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/employees");
  await setFlash("従業員を登録しました");
  redirect(`/employees/${id}`);
}

export async function updateEmployeeAction(employeeId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const v = parsed.data;

  try {
    await withUser(
      async (db, user) => {
        // 自分自身の権限を外す・退職にすると誰も管理できなくなるのを防ぐ
        if (employeeId === user.employeeId && (v.role !== "admin" || v.employmentStatus !== "active")) {
          throw Object.assign(new Error("self"), { code: "SELF_DEMOTION" });
        }
        const updated = await db.execute(sql`
          update public.employees set
            last_name = ${v.lastName}, first_name = ${v.firstName}, last_name_kana = ${v.lastNameKana},
            first_name_kana = ${v.firstNameKana}, email = ${v.email}, phone = ${v.phone}, department_id = ${v.departmentId},
            position = ${v.position}, role = ${v.role}, hire_date = ${v.hireDate}, employment_status = ${v.employmentStatus}
          where id = ${employeeId}
        `);
        if (updated === 0) throw new NotFoundError();
        await db.execute(sql`
          insert into public.employee_cost_rates (employee_id, hourly_cost) values (${employeeId}, ${v.hourlyCost})
          on conflict (employee_id) do update set hourly_cost = excluded.hourly_cost
        `);
      },
      { roles: ["admin"] },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "SELF_DEMOTION") {
      return { ok: false, message: "自分自身の権限変更・退職処理はできません。別の管理者に依頼してください。" };
    }
    return toActionError(error);
  }
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  await setFlash("従業員情報を更新しました");
  redirect(`/employees/${employeeId}`);
}
