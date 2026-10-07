import { NextResponse } from "next/server";

import { CONSTRUCTION_TYPE_LABELS, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { todayJst } from "@/lib/date";
import { calcProfitRate } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/session";
import { getDatabase, sql } from "@/server/db";
import { getMonthlyFinance } from "@/server/queries/dashboard";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // CSV インジェクション対策（= + - @ で始まるセルを無害化）
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(rows: unknown[][]): string {
  // Excel で文字化けしないよう UTF-8 BOM を付与
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** レポートの CSV ダウンロード（管理者のみ） */
export async function GET(_request: Request, context: RouteContext<"/api/reports/[kind]">) {
  const { kind } = await context.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const today = todayJst();
  const database = await getDatabase();
  let rows: unknown[][];

  if (kind === "monthly") {
    const monthly = await database.asUser(user.authUserId, (db) => getMonthlyFinance(db, today));
    rows = [
      ["月", "完工件数", "売上(円)", "原価(円)", "粗利益(円)", "粗利率(%)"],
      ...monthly.map((m) => [m.month, m.projectCount, m.revenue, m.cost, m.profit, calcProfitRate(m.revenue, m.cost) ?? ""]),
    ];
  } else if (kind === "projects") {
    const projects = await database.asUser(user.authUserId, (db) =>
      db.many<{
        projectCode: string;
        name: string;
        customerName: string;
        constructionType: keyof typeof CONSTRUCTION_TYPE_LABELS;
        status: keyof typeof PROJECT_STATUS_LABELS;
        contractAmount: number | null;
        budgetCost: number | null;
        laborCost: number;
        materialCost: number;
        outsourcingCost: number;
        expenseCost: number;
        totalCost: number;
        grossProfit: number | null;
        profitRate: number | null;
        actualEndDate: string | null;
      }>(sql`
        select p.project_code, p.name, c.name as customer_name, p.construction_type, p.status, p.contract_amount,
               p.budget_cost, pc.labor_cost, pc.material_cost, pc.outsourcing_cost, pc.expense_cost, pc.total_cost,
               pc.gross_profit, pc.profit_rate, p.actual_end_date
        from public.projects p
        join public.customers c on c.id = p.customer_id
        join public.v_project_costs pc on pc.project_id = p.id
        order by p.project_code
      `),
    );
    rows = [
      ["案件ID", "案件名", "顧客名", "工事種別", "ステータス", "受注金額", "予算原価", "労務費", "材料費", "外注費", "その他経費", "総原価", "粗利益", "利益率(%)", "完工日"],
      ...projects.map((p) => [
        p.projectCode,
        p.name,
        p.customerName,
        CONSTRUCTION_TYPE_LABELS[p.constructionType],
        PROJECT_STATUS_LABELS[p.status],
        p.contractAmount,
        p.budgetCost,
        p.laborCost,
        p.materialCost,
        p.outsourcingCost,
        p.expenseCost,
        p.totalCost,
        p.grossProfit,
        p.profitRate,
        p.actualEndDate,
      ]),
    ];
  } else {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
