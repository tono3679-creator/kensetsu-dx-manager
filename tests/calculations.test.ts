import { describe, expect, it } from "vitest";

import { calcOvertimeMinutes, calcWorkMinutes } from "@/lib/attendance";
import { addMonths, endOfMonth, jstToIso, previousWeekday, recentMonthKeys, toJstDateString } from "@/lib/date";
import { formatDate, formatMinutes, formatYen, formatYenCompact } from "@/lib/format";
import {
  calcBudgetUsageRate,
  calcGrossProfit,
  calcLaborCost,
  calcMaterialAmount,
  calcProfitRate,
  roundHalfAwayFromZero,
  toCents,
} from "@/lib/money";
import { profitView } from "@/lib/project-finance";

describe("金額計算（小数誤差なし）", () => {
  it("数値文字列を100倍の整数に変換する", () => {
    expect(toCents("12.5")).toBe(1250);
    expect(toCents("1,234.56")).toBe(123456);
    expect(toCents("0.1")).toBe(10);
    expect(toCents("abc")).toBeNull();
    expect(toCents("1.234")).toBeNull();
  });

  it("材料費 = 数量 × 単価（円未満四捨五入）", () => {
    expect(calcMaterialAmount("12.5", "85.5")).toBe(1069); // 1068.75
    expect(calcMaterialAmount("3", "1000")).toBe(3000);
    expect(calcMaterialAmount("0.1", "0.3")).toBe(0); // 0.03（浮動小数点なら 0.030000000000000002）
    expect(calcMaterialAmount("1.25", "2")).toBe(3); // 2.5 → 3
    expect(calcMaterialAmount("2,256", "168")).toBe(379008);
    expect(calcMaterialAmount("x", "1")).toBeNull();
  });

  it("労務費 = 時間原価 × 実働時間（要件の例: 2,500円 × 8時間 = 20,000円）", () => {
    expect(calcLaborCost(2500, 8 * 60)).toBe(20000);
    expect(calcLaborCost(2500, 510)).toBe(21250);
    expect(calcLaborCost(2200, 7)).toBe(257); // 256.67 → 257
  });

  it("粗利益・利益率・予算消化率", () => {
    expect(calcGrossProfit(5_800_000, 4_060_000)).toBe(1_740_000);
    expect(calcProfitRate(5_800_000, 4_060_000)).toBe(30);
    expect(calcProfitRate(7_200_000, 7_772_400)).toBe(-8);
    expect(calcProfitRate(3, 2)).toBe(33.3);
    expect(calcProfitRate(null, 100)).toBeNull();
    expect(calcProfitRate(0, 100)).toBeNull();
    expect(calcBudgetUsageRate(17_370_000, 18_523_368)).toBe(106.6);
  });

  it("四捨五入は PostgreSQL の round と同じく 0 から遠い方向", () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
  });

  it("完工前の案件は見込原価（予算と実績の大きい方）で利益率を出す", () => {
    expect(profitView({ status: "in_progress", contractAmount: 1_000_000, budgetCost: 700_000, totalCost: 300_000 })).toEqual({
      profit: 300_000,
      rate: 30,
      forecast: true,
      cost: 700_000,
    });
    expect(profitView({ status: "in_progress", contractAmount: 1_000_000, budgetCost: 700_000, totalCost: 900_000 })?.rate).toBe(10);
    expect(profitView({ status: "paid", contractAmount: 1_000_000, budgetCost: 700_000, totalCost: 650_000 })?.forecast).toBe(false);
    expect(profitView({ status: "estimating", contractAmount: null, budgetCost: 700_000, totalCost: 0 })).toBeNull();
  });
});

describe("勤怠計算", () => {
  const clockIn = jstToIso("2026-10-07", "08:00");
  const clockOut = jstToIso("2026-10-07", "17:30");

  it("実働時間 = 退勤 - 出勤 - 休憩", () => {
    expect(calcWorkMinutes(clockIn, clockOut, 60)).toBe(510);
    expect(calcWorkMinutes(clockIn, null, 60)).toBeNull();
    expect(calcWorkMinutes(clockIn, jstToIso("2026-10-07", "08:30"), 60)).toBe(0);
  });

  it("残業時間 = 所定労働時間を超えた分", () => {
    expect(calcOvertimeMinutes(510, 480)).toBe(30);
    expect(calcOvertimeMinutes(420, 480)).toBe(0);
    expect(calcOvertimeMinutes(null, 480)).toBeNull();
  });
});

describe("日付（日本時間）", () => {
  it("UTC の日時を日本時間の日付に変換する", () => {
    expect(toJstDateString(new Date("2026-10-06T15:30:00Z"))).toBe("2026-10-07");
    expect(jstToIso("2026-10-07", "08:00")).toBe("2026-10-06T23:00:00.000Z");
  });

  it("月末・月の加減算・前営業日", () => {
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(previousWeekday("2026-10-05")).toBe("2026-10-02"); // 月曜 → 金曜
    expect(recentMonthKeys("2026-10-07", 3)).toEqual(["2026-08", "2026-09", "2026-10"]);
  });
});

describe("表示フォーマット（日本仕様）", () => {
  it("金額は3桁カンマ + 円", () => {
    expect(formatYen(5_800_000)).toBe("5,800,000円");
    expect(formatYen(-572_400)).toBe("-572,400円");
    expect(formatYen(null)).toBe("—");
    expect(formatYenCompact(162_910_000)).toBe("1.63億円");
    expect(formatYenCompact(9_500_000)).toBe("950万円");
  });

  it("日付は YYYY/MM/DD、時間は 24 時間表記", () => {
    expect(formatDate("2026-10-07")).toBe("2026/10/07");
    expect(formatMinutes(510)).toBe("8:30");
  });
});
