import type {
  AppRole,
  ConstructionType,
  CostType,
  EmploymentStatus,
  ExpenseCategory,
  PhotoPhase,
  ProjectStatus,
} from "@/types/domain";

export const APP_NAME = "建設DX Manager";

/** バッジの色調 */
export type Tone = "gray" | "blue" | "indigo" | "amber" | "green" | "teal" | "violet" | "red" | "orange";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "管理者",
  manager: "現場責任者",
  staff: "一般スタッフ",
};

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "在籍",
  on_leave: "休職",
  retired: "退職",
};

export const EMPLOYMENT_STATUS_TONES: Record<EmploymentStatus, Tone> = {
  active: "green",
  on_leave: "amber",
  retired: "gray",
};

export const CONSTRUCTION_TYPE_LABELS: Record<ConstructionType, string> = {
  electrical: "電気工事",
  hvac: "空調工事",
  plumbing: "水道設備",
  renovation: "リフォーム",
  painting: "塗装",
  roofing: "屋根工事",
  other: "その他",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  estimating: "見積中",
  ordered: "受注",
  preparing: "着工前",
  in_progress: "工事中",
  completed: "完工",
  invoiced: "請求済",
  paid: "入金済",
  lost: "失注",
};

export const PROJECT_STATUS_TONES: Record<ProjectStatus, Tone> = {
  estimating: "gray",
  ordered: "indigo",
  preparing: "violet",
  in_progress: "blue",
  completed: "amber",
  invoiced: "teal",
  paid: "green",
  lost: "red",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  parking: "駐車場",
  highway: "高速代",
  fuel: "ガソリン",
  heavy_equipment: "重機",
  rental: "レンタル",
  waste_disposal: "廃材処分",
  other: "その他",
};

export const PHOTO_PHASE_LABELS: Record<PhotoPhase, string> = {
  before: "施工前",
  during: "施工中",
  after: "施工後",
};

export const COST_TYPE_LABELS: Record<CostType, string> = {
  material: "材料費",
  outsourcing: "外注費",
  expense: "その他経費",
};

/** 利益率の評価しきい値（%） */
export const PROFIT_RATE_THRESHOLDS = {
  low: 10,
  good: 25,
} as const;

export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS: ReadonlyArray<{ role: AppRole; email: string; name: string; description: string }> = [
  {
    role: "admin",
    email: "admin@yamada-setsubi.example",
    name: "山田 太一",
    description: "代表取締役。経営ダッシュボード・全機能を利用",
  },
  {
    role: "manager",
    email: "manager@yamada-setsubi.example",
    name: "鈴木 一郎",
    description: "工事部 課長。担当案件・日報・材料費/経費の登録",
  },
  {
    role: "staff",
    email: "staff@yamada-setsubi.example",
    name: "田中 太郎",
    description: "電気工。出退勤の打刻・日報登録",
  },
];
