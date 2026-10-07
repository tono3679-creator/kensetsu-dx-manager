import type { ConstructionType, PhotoPhase, ProjectStatus } from "@/types/domain";

import type { EmployeeKey, SAMPLE_PHOTOS } from "./master-data";

/**
 * 案件シナリオ定義。日付はすべて「今日」からの相対値で指定し、
 * いつ起動しても直近12ヶ月の売上推移・アラートが自然に見えるようにしている。
 */
export type Timing =
  /** 完工済み: endMonth ヶ月前（0=今月）の endDay 日に完工。days=工期(暦日)、delay=予定からの遅延日数 */
  | { kind: "done"; endMonth: number; endDay: number; days: number; delay?: number }
  /** 工事中: startedDaysAgo 日前に着工、予定工期 plannedDays 日（超過していれば工期遅延） */
  | { kind: "active"; startedDaysAgo: number; plannedDays: number }
  /** 受注・着工前: contractDaysAgo 日前に契約、startInDays 日後に着工予定 */
  | { kind: "upcoming"; contractDaysAgo: number; startInDays: number; plannedDays: number }
  /** 見積中 */
  | { kind: "estimate"; estimateDaysAgo: number; startInDays: number; plannedDays: number }
  /** 失注 */
  | { kind: "lost"; estimateDaysAgo: number; plannedDays: number };

export interface ProjectSpec {
  key: string;
  name: string;
  customer: string;
  type: ConstructionType;
  salesRep: EmployeeKey;
  siteManager: EmployeeKey;
  members: EmployeeKey[];
  /** 受注金額（見積中・失注の場合は見積金額） */
  amount: number;
  /** 予算原価 ÷ 受注金額 */
  budgetRatio: number;
  /** 完工時の実績原価 ÷ 予算原価（1.0 超で予算超過） */
  costRatio: number;
  status: ProjectStatus;
  timing: Timing;
  /** 工事中案件の出来高（0〜1） */
  progress?: number;
  memo?: string;
  photos?: Array<{ phase: PhotoPhase; file: keyof typeof SAMPLE_PHOTOS; caption: string }>;
}

export const PROJECT_SPECS: readonly ProjectSpec[] = [
  // ---------------------------------------------------------------- 完工済み（入金済・請求済・未請求）
  { key: "gh-east-led", name: "グリーンハイツ東棟 共用部照明LED化工事", customer: "C0001", type: "electrical", salesRep: "yamada", siteManager: "suzuki", members: ["tanaka", "kobayashi"], amount: 2_450_000, budgetRatio: 0.7, costRatio: 0.97, status: "paid", timing: { kind: "done", endMonth: -13, endDay: 20, days: 14 } },
  { key: "hokuto1-panel", name: "北斗フーズ 第一工場 分電盤更新工事", customer: "C0005", type: "electrical", salesRep: "ito", siteManager: "suzuki", members: ["tanaka"], amount: 3_800_000, budgetRatio: 0.72, costRatio: 0.98, status: "paid", timing: { kind: "done", endMonth: -12, endDay: 15, days: 18 } },
  { key: "kawaguchi-led", name: "川口商店 店舗照明LED化工事", customer: "C0008", type: "electrical", salesRep: "ito", siteManager: "suzuki", members: ["kobayashi"], amount: 1_850_000, budgetRatio: 0.62, costRatio: 0.96, status: "paid", timing: { kind: "done", endMonth: -11, endDay: 12, days: 8 } },
  { key: "gh-east-pump", name: "グリーンハイツ東棟 給水ポンプ更新工事", customer: "C0001", type: "plumbing", salesRep: "yamada", siteManager: "watanabe", members: ["nakamura"], amount: 2_950_000, budgetRatio: 0.72, costRatio: 1.0, status: "paid", timing: { kind: "done", endMonth: -11, endDay: 26, days: 10 } },
  { key: "takagi-ac", name: "高木様邸 エアコン入替工事（3台）", customer: "C0011", type: "hvac", salesRep: "takahashi", siteManager: "takahashi", members: ["yoshida"], amount: 980_000, budgetRatio: 0.7, costRatio: 0.97, status: "paid", timing: { kind: "done", endMonth: -10, endDay: 9, days: 4 } },
  { key: "towa-apt-led", name: "東和不動産 アパート2棟 共用部照明改修工事", customer: "C0002", type: "electrical", salesRep: "ito", siteManager: "suzuki", members: ["tanaka", "kobayashi"], amount: 5_200_000, budgetRatio: 0.72, costRatio: 0.99, status: "paid", timing: { kind: "done", endMonth: -10, endDay: 24, days: 20 } },
  { key: "minato-led", name: "ミナト物流 倉庫照明LED化工事", customer: "C0009", type: "electrical", salesRep: "suzuki", siteManager: "suzuki", members: ["kobayashi"], amount: 4_200_000, budgetRatio: 0.7, costRatio: 0.98, status: "paid", timing: { kind: "done", endMonth: -9, endDay: 10, days: 14 } },
  { key: "yamato-ac", name: "大和ビルサービス 空調機器更新工事", customer: "C0006", type: "hvac", salesRep: "yamada", siteManager: "takahashi", members: ["yoshida"], amount: 6_400_000, budgetRatio: 0.74, costRatio: 0.98, status: "paid", timing: { kind: "done", endMonth: -9, endDay: 18, days: 22 } },
  { key: "sato-kitchen", name: "佐藤様邸 キッチンリフォーム工事", customer: "C0010", type: "renovation", salesRep: "watanabe", siteManager: "watanabe", members: ["nakamura"], amount: 2_100_000, budgetRatio: 0.82, costRatio: 1.08, status: "paid", timing: { kind: "done", endMonth: -9, endDay: 25, days: 9, delay: 3 }, memo: "キッチン下地の腐食補修が追加で発生（施主了承済み・追加請求なし）。" },
  { key: "hokuto1-pipe", name: "北斗フーズ 第一工場 冷却水配管改修工事", customer: "C0005", type: "plumbing", salesRep: "yamada", siteManager: "watanabe", members: ["nakamura", "kato"], amount: 8_700_000, budgetRatio: 0.73, costRatio: 0.97, status: "paid", timing: { kind: "done", endMonth: -8, endDay: 14, days: 28 } },
  { key: "morishita-paint", name: "森下様邸 外壁塗装工事", customer: "C0015", type: "painting", salesRep: "ito", siteManager: "watanabe", members: ["kato"], amount: 2_400_000, budgetRatio: 0.6, costRatio: 0.95, status: "paid", timing: { kind: "done", endMonth: -8, endDay: 27, days: 12 } },
  { key: "aoba-toilet", name: "青葉市 公民館 トイレ改修工事", customer: "C0007", type: "plumbing", salesRep: "yamada", siteManager: "watanabe", members: ["nakamura"], amount: 5_600_000, budgetRatio: 0.74, costRatio: 1.0, status: "paid", timing: { kind: "done", endMonth: -7, endDay: 10, days: 25, delay: 4 } },
  { key: "sunrise-1", name: "サンライズホテル 客室給湯配管更新工事（第1期）", customer: "C0012", type: "plumbing", salesRep: "yamada", siteManager: "watanabe", members: ["nakamura", "kato"], amount: 4_800_000, budgetRatio: 0.73, costRatio: 1.02, status: "paid", timing: { kind: "done", endMonth: -7, endDay: 22, days: 24 } },
  { key: "bayside-power", name: "ベイサイドカフェ 店舗電気容量増設工事", customer: "C0013", type: "electrical", salesRep: "suzuki", siteManager: "suzuki", members: ["kobayashi"], amount: 1_280_000, budgetRatio: 0.58, costRatio: 0.97, status: "paid", timing: { kind: "done", endMonth: -7, endDay: 27, days: 5 } },
  { key: "hidamari-ac", name: "ひだまり介護センター 空調設備更新工事", customer: "C0004", type: "hvac", salesRep: "ito", siteManager: "takahashi", members: ["yoshida", "kato"], amount: 8_200_000, budgetRatio: 0.73, costRatio: 0.98, status: "paid", timing: { kind: "done", endMonth: -6, endDay: 12, days: 28 } },
  { key: "ota-house-elec", name: "オオタ工務店 新築住宅 電気設備工事（2棟）", customer: "C0014", type: "electrical", salesRep: "ito", siteManager: "suzuki", members: ["tanaka"], amount: 3_600_000, budgetRatio: 0.75, costRatio: 1.0, status: "paid", timing: { kind: "done", endMonth: -6, endDay: 20, days: 14 } },
  { key: "kawaguchi-roof", name: "川口商店 倉庫屋根補修工事", customer: "C0008", type: "roofing", salesRep: "ito", siteManager: "takahashi", members: ["kato"], amount: 1_900_000, budgetRatio: 0.72, costRatio: 0.99, status: "paid", timing: { kind: "done", endMonth: -6, endDay: 26, days: 7 } },
  { key: "aoba-school-led", name: "青葉学園 校舎照明LED化工事", customer: "C0016", type: "electrical", salesRep: "yamada", siteManager: "suzuki", members: ["tanaka", "kobayashi"], amount: 13_800_000, budgetRatio: 0.62, costRatio: 0.96, status: "paid", timing: { kind: "done", endMonth: -5, endDay: 25, days: 40 }, photos: [{ phase: "before", file: "ceilingBefore", caption: "3階 普通教室 既設蛍光灯" }, { phase: "after", file: "ceilingAfter", caption: "3階 普通教室 LED化完了" }] },
  { key: "takagi-bath", name: "高木様邸 浴室リフォーム工事", customer: "C0011", type: "renovation", salesRep: "ito", siteManager: "watanabe", members: ["nakamura"], amount: 1_850_000, budgetRatio: 0.74, costRatio: 1.0, status: "paid", timing: { kind: "done", endMonth: -5, endDay: 14, days: 8 } },
  { key: "hokuto1-ac", name: "北斗フーズ 第一工場 空調設備増設工事", customer: "C0005", type: "hvac", salesRep: "yamada", siteManager: "takahashi", members: ["yoshida", "kato"], amount: 11_200_000, budgetRatio: 0.8, costRatio: 1.31, status: "paid", timing: { kind: "done", endMonth: -4, endDay: 21, days: 35, delay: 9 }, memo: "既設ダクトの劣化により追加工事が発生。追加費用の請求交渉が不調に終わり赤字。見積段階での現地調査範囲を見直すこと。" },
  { key: "gh-south-pipe", name: "グリーンハイツ南棟 給水管更生工事", customer: "C0001", type: "plumbing", salesRep: "yamada", siteManager: "watanabe", members: ["nakamura"], amount: 7_600_000, budgetRatio: 0.72, costRatio: 0.99, status: "paid", timing: { kind: "done", endMonth: -4, endDay: 12, days: 26 } },
  { key: "yamato-emergency", name: "大和ビルサービス 非常照明更新工事", customer: "C0006", type: "electrical", salesRep: "suzuki", siteManager: "suzuki", members: ["kobayashi"], amount: 2_800_000, budgetRatio: 0.62, costRatio: 0.95, status: "paid", timing: { kind: "done", endMonth: -4, endDay: 26, days: 10 } },
  { key: "towa-new-pipe", name: "東和不動産 新築アパート 給排水設備工事", customer: "C0002", type: "plumbing", salesRep: "ito", siteManager: "watanabe", members: ["nakamura", "kato"], amount: 6_900_000, budgetRatio: 0.74, costRatio: 1.0, status: "paid", timing: { kind: "done", endMonth: -3, endDay: 18, days: 25 } },
  { key: "minato-ac", name: "ミナト物流 事務所空調入替工事", customer: "C0009", type: "hvac", salesRep: "takahashi", siteManager: "takahashi", members: ["yoshida"], amount: 5_400_000, budgetRatio: 0.72, costRatio: 0.97, status: "paid", timing: { kind: "done", endMonth: -3, endDay: 24, days: 16 } },
  { key: "morishita-kitchen", name: "森下様邸 キッチン・洗面リフォーム工事", customer: "C0015", type: "renovation", salesRep: "watanabe", siteManager: "watanabe", members: ["nakamura"], amount: 4_100_000, budgetRatio: 0.84, costRatio: 1.06, status: "paid", timing: { kind: "done", endMonth: -3, endDay: 10, days: 14 } },
  { key: "sunrise-hall", name: "サンライズホテル 宴会場照明調光設備更新工事", customer: "C0012", type: "electrical", salesRep: "yamada", siteManager: "suzuki", members: ["tanaka", "kobayashi"], amount: 11_500_000, budgetRatio: 0.72, costRatio: 1.0, status: "invoiced", timing: { kind: "done", endMonth: -2, endDay: 20, days: 32 } },
  { key: "sakura-elec", name: "さくら内科クリニック 電気設備改修工事", customer: "C0003", type: "electrical", salesRep: "suzuki", siteManager: "suzuki", members: ["tanaka"], amount: 3_300_000, budgetRatio: 0.72, costRatio: 0.97, status: "paid", timing: { kind: "done", endMonth: -2, endDay: 8, days: 12 } },
  { key: "aoba-library-paint", name: "青葉市 図書館 外壁塗装工事", customer: "C0007", type: "painting", salesRep: "yamada", siteManager: "watanabe", members: ["kato"], amount: 6_400_000, budgetRatio: 0.73, costRatio: 1.0, status: "invoiced", timing: { kind: "done", endMonth: -2, endDay: 26, days: 30 } },
  { key: "sakura-ac", name: "さくら内科クリニック 空調設備更新工事", customer: "C0003", type: "hvac", salesRep: "ito", siteManager: "takahashi", members: ["yoshida", "kato"], amount: 5_800_000, budgetRatio: 0.7, costRatio: 1.0, status: "invoiced", timing: { kind: "done", endMonth: -1, endDay: 18, days: 20 }, photos: [{ phase: "before", file: "hvacBefore", caption: "待合室 既設エアコン（2008年製）" }, { phase: "during", file: "hvacDuring", caption: "室内機 吊り込み作業" }, { phase: "after", file: "hvacAfter", caption: "待合室 新設エアコン 試運転完了" }] },
  { key: "hidamari-bath", name: "ひだまり介護センター 浴室改修工事", customer: "C0004", type: "renovation", salesRep: "ito", siteManager: "watanabe", members: ["nakamura"], amount: 7_200_000, budgetRatio: 0.85, costRatio: 1.27, status: "completed", timing: { kind: "done", endMonth: -1, endDay: 12, days: 24, delay: 6 }, memo: "追加工事（給湯配管の更新）が発生。追加請求の金額を先方と協議中のため請求を保留している。" },
  { key: "ota-house-pipe", name: "オオタ工務店 新築住宅 給排水設備工事（3棟）", customer: "C0014", type: "plumbing", salesRep: "ito", siteManager: "watanabe", members: ["nakamura"], amount: 5_400_000, budgetRatio: 0.74, costRatio: 0.98, status: "invoiced", timing: { kind: "done", endMonth: -1, endDay: 25, days: 18 } },
  { key: "gh-west-intercom", name: "グリーンハイツ西棟 インターホン設備更新工事", customer: "C0001", type: "electrical", salesRep: "yamada", siteManager: "suzuki", members: ["kobayashi", "tanaka"], amount: 6_200_000, budgetRatio: 0.66, costRatio: 0.97, status: "completed", timing: { kind: "done", endMonth: 0, endDay: 3, days: 18 } },
  { key: "kawaguchi-ac", name: "川口商店 業務用エアコン入替工事", customer: "C0008", type: "hvac", salesRep: "takahashi", siteManager: "takahashi", members: ["yoshida"], amount: 3_300_000, budgetRatio: 0.72, costRatio: 0.98, status: "completed", timing: { kind: "done", endMonth: 0, endDay: 5, days: 6 } },

  // ---------------------------------------------------------------- 工事中
  { key: "gh-south-led", name: "グリーンハイツ南棟 共用部LED照明改修工事", customer: "C0001", type: "electrical", salesRep: "yamada", siteManager: "suzuki", members: ["tanaka", "kobayashi"], amount: 6_800_000, budgetRatio: 0.72, costRatio: 0.97, status: "in_progress", progress: 0.5, timing: { kind: "active", startedDaysAgo: 18, plannedDays: 35 }, photos: [{ phase: "before", file: "ceilingBefore", caption: "1階 エントランス 既設照明" }, { phase: "during", file: "ceilingDuring", caption: "共用廊下 器具交換作業" }] },
  { key: "hokuto2-power", name: "北斗フーズ 第二工場 動力盤増設工事", customer: "C0005", type: "electrical", salesRep: "yamada", siteManager: "suzuki", members: ["tanaka", "kobayashi"], amount: 14_500_000, budgetRatio: 0.72, costRatio: 1.07, status: "in_progress", progress: 0.86, timing: { kind: "active", startedDaysAgo: 52, plannedDays: 40 }, memo: "工場の稼働調整により停電作業日が2回延期。完工予定日を超過しているため工程の再調整が必要。" },
  { key: "sunrise-2", name: "サンライズホテル 客室給湯配管更新工事（第2期）", customer: "C0012", type: "plumbing", salesRep: "yamada", siteManager: "watanabe", members: ["nakamura", "kato"], amount: 23_800_000, budgetRatio: 0.73, costRatio: 1.24, status: "in_progress", progress: 0.86, timing: { kind: "active", startedDaysAgo: 40, plannedDays: 55 }, memo: "既設配管の腐食が想定以上で交換範囲が拡大。追加見積を提出済み（回答待ち）。", photos: [{ phase: "before", file: "pipeBefore", caption: "5階 PS内 既設給湯管（腐食あり）" }, { phase: "during", file: "pipeDuring", caption: "5階 PS内 新設配管 施工中" }] },
  { key: "minato-roof", name: "ミナト物流 倉庫屋根カバー工法改修工事", customer: "C0009", type: "roofing", salesRep: "ito", siteManager: "takahashi", members: ["kato", "nakamura"], amount: 19_800_000, budgetRatio: 0.74, costRatio: 0.98, status: "in_progress", progress: 0.5, timing: { kind: "active", startedDaysAgo: 25, plannedDays: 45 } },
  { key: "aoba-gym-ac", name: "青葉学園 体育館空調設置工事", customer: "C0016", type: "hvac", salesRep: "yamada", siteManager: "takahashi", members: ["yoshida", "kato"], amount: 32_000_000, budgetRatio: 0.72, costRatio: 0.96, status: "in_progress", progress: 0.4, timing: { kind: "active", startedDaysAgo: 30, plannedDays: 70 }, photos: [{ phase: "before", file: "hvacBefore", caption: "体育館 施工前（空調設備なし）" }, { phase: "during", file: "hvacDuring", caption: "室外機 搬入・据付" }] },
  { key: "sato-bath", name: "佐藤様邸 浴室・洗面所リフォーム工事", customer: "C0010", type: "renovation", salesRep: "watanabe", siteManager: "watanabe", members: ["nakamura"], amount: 2_680_000, budgetRatio: 0.8, costRatio: 1.1, status: "in_progress", progress: 0.9, timing: { kind: "active", startedDaysAgo: 20, plannedDays: 14 }, memo: "ユニットバスの納期遅延（メーカー欠品）により工期を延長。施主様には説明済み。" },
  { key: "yamato-substation", name: "大和ビルサービス 本社ビル 受変電設備更新工事", customer: "C0006", type: "electrical", salesRep: "ito", siteManager: "suzuki", members: ["tanaka"], amount: 9_800_000, budgetRatio: 0.72, costRatio: 0.97, status: "in_progress", progress: 0.2, timing: { kind: "active", startedDaysAgo: 8, plannedDays: 30 } },

  // ---------------------------------------------------------------- 着工前・受注
  { key: "towa-new-elec", name: "東和不動産 新築アパート 電気設備工事", customer: "C0002", type: "electrical", salesRep: "ito", siteManager: "suzuki", members: ["kobayashi"], amount: 7_600_000, budgetRatio: 0.73, costRatio: 1.0, status: "preparing", timing: { kind: "upcoming", contractDaysAgo: 20, startInDays: 6, plannedDays: 40 } },
  { key: "hidamari-boiler", name: "ひだまり介護センター 給湯ボイラー更新工事", customer: "C0004", type: "plumbing", salesRep: "ito", siteManager: "watanabe", members: ["nakamura"], amount: 5_200_000, budgetRatio: 0.74, costRatio: 1.0, status: "preparing", timing: { kind: "upcoming", contractDaysAgo: 14, startInDays: 12, plannedDays: 18 } },
  { key: "kawaguchi-paint", name: "川口商店 店舗外壁塗装工事", customer: "C0008", type: "painting", salesRep: "ito", siteManager: "watanabe", members: ["kato"], amount: 3_100_000, budgetRatio: 0.72, costRatio: 1.0, status: "ordered", timing: { kind: "upcoming", contractDaysAgo: 5, startInDays: 25, plannedDays: 14 } },
  { key: "bayside-ac", name: "ベイサイドカフェ 厨房換気・空調改修工事", customer: "C0013", type: "hvac", salesRep: "takahashi", siteManager: "takahashi", members: ["yoshida"], amount: 4_200_000, budgetRatio: 0.72, costRatio: 1.0, status: "ordered", timing: { kind: "upcoming", contractDaysAgo: 9, startInDays: 18, plannedDays: 10 } },

  // ---------------------------------------------------------------- 見積中
  { key: "morishita-roof", name: "森下様邸 屋根葺き替え工事", customer: "C0015", type: "roofing", salesRep: "ito", siteManager: "takahashi", members: [], amount: 3_850_000, budgetRatio: 0.72, costRatio: 1.0, status: "estimating", timing: { kind: "estimate", estimateDaysAgo: 6, startInDays: 40, plannedDays: 12 } },
  { key: "towa-camera", name: "東和不動産 賃貸マンション 共用部防犯カメラ設置工事", customer: "C0002", type: "other", salesRep: "ito", siteManager: "suzuki", members: [], amount: 1_450_000, budgetRatio: 0.7, costRatio: 1.0, status: "estimating", timing: { kind: "estimate", estimateDaysAgo: 3, startInDays: 30, plannedDays: 5 } },
  { key: "ota-3houses-elec", name: "オオタ工務店 新築住宅3棟 電気設備工事", customer: "C0014", type: "electrical", salesRep: "ito", siteManager: "suzuki", members: [], amount: 6_900_000, budgetRatio: 0.75, costRatio: 1.0, status: "estimating", timing: { kind: "estimate", estimateDaysAgo: 10, startInDays: 50, plannedDays: 30 } },

  // ---------------------------------------------------------------- 失注
  { key: "gh-north-paint", name: "グリーンハイツ北棟 外壁塗装工事", customer: "C0001", type: "painting", salesRep: "yamada", siteManager: "watanabe", members: [], amount: 12_500_000, budgetRatio: 0.74, costRatio: 1.0, status: "lost", timing: { kind: "lost", estimateDaysAgo: 75, plannedDays: 30 }, memo: "相見積もりにより他社に決定（価格差 約8%）。次回の大規模修繕では早期に提案すること。" },
  { key: "takagi-solar", name: "高木様邸 太陽光発電設備設置工事", customer: "C0011", type: "electrical", salesRep: "ito", siteManager: "suzuki", members: [], amount: 2_800_000, budgetRatio: 0.72, costRatio: 1.0, status: "lost", timing: { kind: "lost", estimateDaysAgo: 120, plannedDays: 6 }, memo: "補助金の採択見送りにより施主様が計画を延期。" },
];
