/** DB の列挙型と 1:1 で対応するドメイン型 */

export const APP_ROLES = ["admin", "manager", "staff"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const EMPLOYMENT_STATUSES = ["active", "on_leave", "retired"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const CONSTRUCTION_TYPES = [
  "electrical",
  "hvac",
  "plumbing",
  "renovation",
  "painting",
  "roofing",
  "other",
] as const;
export type ConstructionType = (typeof CONSTRUCTION_TYPES)[number];

export const PROJECT_STATUSES = [
  "estimating",
  "ordered",
  "preparing",
  "in_progress",
  "completed",
  "invoiced",
  "paid",
  "lost",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const EXPENSE_CATEGORIES = [
  "parking",
  "highway",
  "fuel",
  "heavy_equipment",
  "rental",
  "waste_disposal",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PHOTO_PHASES = ["before", "during", "after"] as const;
export type PhotoPhase = (typeof PHOTO_PHASES)[number];

export const COST_TYPES = ["material", "outsourcing", "expense"] as const;
export type CostType = (typeof COST_TYPES)[number];

/** 売上計上済み（完工基準）のステータス */
export const REVENUE_STATUSES: readonly ProjectStatus[] = ["completed", "invoiced", "paid"];
/** 進行中（受注済み・未完工）のステータス */
export const ACTIVE_STATUSES: readonly ProjectStatus[] = ["ordered", "preparing", "in_progress"];
