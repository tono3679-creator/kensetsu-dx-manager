import type { ProjectStatus } from "@/types/domain";

import { calcProfitRate } from "./money";

export const COMPLETED_STATUSES: readonly ProjectStatus[] = ["completed", "invoiced", "paid"];
export const OPEN_ORDER_STATUSES: readonly ProjectStatus[] = ["ordered", "preparing", "in_progress"];

export interface ProfitView {
  /** 粗利益（完工前は見込） */
  profit: number;
  /** 利益率（完工前は見込） */
  rate: number | null;
  /** 完工前のため見込値かどうか */
  forecast: boolean;
  /** 計算に使った原価（完工前は見込原価） */
  cost: number;
}

/**
 * 案件の粗利益・利益率の表示値。
 *   完工済み : 実績原価で計算
 *   完工前   : 見込原価 = max(予算原価, 実績原価) で計算（途中経過の原価で利益率が過大に見えるのを防ぐ）
 *   見積中・失注 : null
 */
export function profitView(project: {
  status: ProjectStatus;
  contractAmount: number | null;
  budgetCost: number | null;
  totalCost: number | null;
}): ProfitView | null {
  if (project.contractAmount === null) return null;
  const actual = project.totalCost ?? 0;
  if (COMPLETED_STATUSES.includes(project.status)) {
    return {
      profit: project.contractAmount - actual,
      rate: calcProfitRate(project.contractAmount, actual),
      forecast: false,
      cost: actual,
    };
  }
  if (OPEN_ORDER_STATUSES.includes(project.status)) {
    const cost = Math.max(project.budgetCost ?? 0, actual);
    if (cost === 0) return null;
    return {
      profit: project.contractAmount - cost,
      rate: calcProfitRate(project.contractAmount, cost),
      forecast: true,
      cost,
    };
  }
  return null;
}
