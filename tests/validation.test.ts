import { describe, expect, it } from "vitest";

import { clockInSchema, clockOutSchema } from "@/lib/validation/attendance";
import { formDataToObject } from "@/lib/validation/common";
import { materialSchema } from "@/lib/validation/cost";
import { DAILY_REPORT_ARRAY_KEYS, dailyReportSchema } from "@/lib/validation/daily-report";
import { customerSchema, employeeSchema } from "@/lib/validation/master";
import { projectSchema } from "@/lib/validation/project";

const UUID = "11111111-1111-4111-8111-111111111111";

function fd(entries: Array<[string, string]>) {
  const data = new FormData();
  for (const [k, v] of entries) data.append(k, v);
  return data;
}

describe("フォーム入力の検証", () => {
  it("送信されない任意項目は null として扱う（打刻フォームにメモ欄がない場合など）", () => {
    const parsed = clockInSchema.safeParse(formDataToObject(fd([["projectId", UUID]])));
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ projectId: UUID, note: null });

    const out = clockOutSchema.safeParse(formDataToObject(fd([["attendanceId", UUID], ["breakMinutes", "60"], ["projectId", ""]])));
    expect(out.success).toBe(true);
    expect(out.data?.projectId).toBeNull();
  });

  it("案件: 受注以降は受注金額が必須、金額はカンマ付き・全角でも受け付ける", () => {
    const base = { name: "テスト工事", customerId: UUID, constructionType: "electrical", status: "ordered", memberIds: [] };
    const missing = projectSchema.safeParse(base);
    expect(missing.success).toBe(false);
    expect(missing.error?.issues.some((i) => i.path[0] === "contractAmount")).toBe(true);

    const ok = projectSchema.safeParse({ ...base, contractAmount: "５,８００,０００円", budgetCost: "4060000" });
    expect(ok.success).toBe(true);
    expect(ok.data?.contractAmount).toBe(5_800_000);
  });

  it("案件: 完工予定日は着工予定日以降", () => {
    const parsed = projectSchema.safeParse({
      name: "テスト工事",
      customerId: UUID,
      constructionType: "hvac",
      status: "estimating",
      plannedStartDate: "2026-10-10",
      plannedEndDate: "2026-10-01",
    });
    expect(parsed.success).toBe(false);
  });

  it("材料費: 数量・単価は小数第2位まで", () => {
    const base = { projectId: UUID, purchaseDate: "2026-10-07", name: "ケーブル", unitPrice: "85.5" };
    expect(materialSchema.safeParse({ ...base, quantity: "12.5" }).success).toBe(true);
    expect(materialSchema.safeParse({ ...base, quantity: "12.555" }).success).toBe(false);
    expect(materialSchema.safeParse({ ...base, quantity: "0" }).success).toBe(false);
  });

  it("日報: 使用材料の行を解析し、終了時刻と未来日をチェックする", () => {
    const data = fd([
      ["projectId", UUID],
      ["reportDate", "2026-10-07"],
      ["startTime", "08:00"],
      ["endTime", "17:00"],
      ["breakMinutes", "60"],
      ["workContent", "配線作業"],
      ["progress", "40"],
      ["workerIds", UUID],
      ["materialNames", "VVFケーブル"],
      ["materialQuantities", "30"],
      ["materialUnits", "m"],
      ["materialNames", ""],
      ["materialQuantities", ""],
      ["materialUnits", ""],
    ]);
    const parsed = dailyReportSchema.safeParse({ ...formDataToObject(data, DAILY_REPORT_ARRAY_KEYS), today: "2026-10-07" });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.materials).toEqual([{ name: "VVFケーブル", quantity: "30", unit: "m" }]);

    const future = dailyReportSchema.safeParse({ ...formDataToObject(data, DAILY_REPORT_ARRAY_KEYS), today: "2026-10-06" });
    expect(future.success).toBe(false);

    data.set("endTime", "07:00");
    const reversed = dailyReportSchema.safeParse({ ...formDataToObject(data, DAILY_REPORT_ARRAY_KEYS), today: "2026-10-07" });
    expect(reversed.success).toBe(false);
  });

  it("従業員・顧客: メール・電話・郵便番号・ふりがなの形式", () => {
    const employee = {
      lastName: "田中",
      firstName: "太郎",
      email: "tanaka@example.com",
      role: "staff",
      hourlyCost: "2,500",
      employmentStatus: "active",
    };
    expect(employeeSchema.safeParse(employee).success).toBe(true);
    expect(employeeSchema.safeParse({ ...employee, lastNameKana: "Tanaka" }).success).toBe(false);
    expect(employeeSchema.safeParse({ ...employee, phone: "abc" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "テスト商店", postalCode: "1440052" }).success).toBe(true);
    expect(customerSchema.safeParse({ name: "テスト商店", postalCode: "144-00" }).success).toBe(false);
  });
});
