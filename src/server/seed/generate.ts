import { calcLaborCost } from "@/lib/money";
import {
  addDays,
  addMonths,
  diffDays,
  eachDay,
  endOfMonth,
  isWeekend,
  jstToIso,
  previousWeekday,
  startOfMonth,
  toJstTimeString,
} from "@/lib/date";
import type { ExpenseCategory } from "@/types/domain";

import {
  COMPANY_HOLIDAYS,
  COMPANY_NAME,
  COST_STRUCTURE,
  CUSTOMERS,
  DEMO_AUTH_USER_IDS,
  DEPARTMENTS,
  EMPLOYEES,
  EXPENSE_MEMOS,
  ISSUE_TEMPLATES,
  MATERIAL_CATALOG,
  NOTE_TEMPLATES,
  OUTSOURCING_VENDORS,
  SAMPLE_PHOTOS,
  WORK_STEPS,
  type EmployeeKey,
  type EmployeeSeed,
} from "./master-data";
import { PROJECT_SPECS, type ProjectSpec } from "./project-specs";
import { Random } from "./random";

export type SeedValue = string | number | boolean | null;
export type SeedRow = Record<string, SeedValue>;

export interface SeedDataset {
  settings: SeedRow;
  departments: SeedRow[];
  employees: SeedRow[];
  employeeCostRates: SeedRow[];
  /** ログイン可能なデモアカウント（auth.users に作成する） */
  authUsers: Array<{ id: string; email: string; employeeId: string }>;
  customers: SeedRow[];
  projects: SeedRow[];
  projectMembers: SeedRow[];
  attendance: SeedRow[];
  dailyReports: SeedRow[];
  dailyReportWorkers: SeedRow[];
  dailyReportMaterials: SeedRow[];
  projectPhotos: SeedRow[];
  materials: SeedRow[];
  outsourcingCosts: SeedRow[];
  expenses: SeedRow[];
  sequences: { employee_code_seq: number; customer_code_seq: number; project_code_seq: number };
  /** 案件キー → 生成時に狙った総原価（検証用） */
  targetCosts: Record<string, number>;
}

interface ProjectPlan {
  spec: ProjectSpec;
  id: string;
  code: string;
  createdDate: string;
  contractDate: string | null;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  /** 労務が発生しうる最終日 */
  workEnd: string | null;
  contractAmount: number | null;
  estimateAmount: number;
  budgetCost: number;
  targetCost: number;
  laborBudget: number;
  laborUsed: number;
  workerKeys: EmployeeKey[];
}

interface AttendanceDraft {
  employee: EmployeeSeed;
  date: string;
  projectId: string | null;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  workMinutes: number | null;
}

const roundTo = (value: number, unit: number) => Math.round(value / unit) * unit;
const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const atNine = (date: string) => jstToIso(date, "09:00");

function weekdayBackward(date: string): string {
  let d = date;
  while (isWeekend(d)) d = addDays(d, -1);
  return d;
}

function weekdayForward(date: string): string {
  let d = date;
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}

function isWorkday(date: string): boolean {
  return !isWeekend(date) && !COMPANY_HOLIDAYS.includes(date.slice(5));
}

function minDate(a: string, b: string) {
  return a < b ? a : b;
}

export interface GenerateOptions {
  /** 日本時間の今日 "YYYY-MM-DD" */
  today: string;
  /** 現在時刻（当日の出勤打刻の有無に使用） */
  now?: Date;
  seed?: number;
}

export function generateSeedData({ today, now = new Date(), seed = 20261001 }: GenerateOptions): SeedDataset {
  const rng = new Random(seed);
  const yesterdayWorkday = previousWeekday(today);
  const nowMinutes = (() => {
    const [h, m] = toJstTimeString(now).split(":").map(Number);
    return h * 60 + m;
  })();

  // ------------------------------------------------------------------ 部署・従業員
  const departmentIds = new Map(DEPARTMENTS.map((d) => [d.key, rng.uuid()]));
  const departments: SeedRow[] = DEPARTMENTS.map((d) => ({
    id: departmentIds.get(d.key)!,
    name: d.name,
    sort_order: d.sortOrder,
  }));

  const employeeIds = new Map<EmployeeKey, string>(EMPLOYEES.map((e) => [e.key, rng.uuid()]));
  const employeeById = (key: EmployeeKey) => employeeIds.get(key)!;
  const employees: SeedRow[] = EMPLOYEES.map((e) => ({
    id: employeeById(e.key),
    employee_code: e.code,
    last_name: e.lastName,
    first_name: e.firstName,
    last_name_kana: e.lastNameKana,
    first_name_kana: e.firstNameKana,
    email: e.email,
    phone: e.phone,
    department_id: departmentIds.get(e.department)!,
    position: e.position,
    role: e.role,
    hire_date: e.hireDate,
    employment_status: e.status,
  }));
  const employeeCostRates: SeedRow[] = EMPLOYEES.map((e) => ({
    employee_id: employeeById(e.key),
    hourly_cost: e.hourlyCost,
  }));
  const authUsers = EMPLOYEES.filter((e) => e.loginAs).map((e) => ({
    id: DEMO_AUTH_USER_IDS[e.loginAs!],
    email: e.email,
    employeeId: employeeById(e.key),
  }));
  const rateOf = new Map(EMPLOYEES.map((e) => [e.key, e.hourlyCost]));

  // ------------------------------------------------------------------ 顧客
  const customerIds = new Map(CUSTOMERS.map((c) => [c.code, rng.uuid()]));
  const customerAddress = new Map(CUSTOMERS.map((c) => [c.code, c.address]));
  const customerCreated = addDays(today, -480);
  const customers: SeedRow[] = CUSTOMERS.map((c, i) => ({
    id: customerIds.get(c.code)!,
    customer_code: c.code,
    name: c.name,
    corporate_name: c.corporateName,
    contact_person: c.contactPerson,
    phone: c.phone,
    email: c.email,
    postal_code: c.postalCode,
    address: c.address,
    memo: c.memo,
    created_at: atNine(addDays(customerCreated, i * 7)),
    updated_at: atNine(addDays(customerCreated, i * 7)),
  }));

  // ------------------------------------------------------------------ 案件の日程・金額
  const plans: ProjectPlan[] = PROJECT_SPECS.map((spec) => {
    const t = spec.timing;
    let createdDate: string;
    let contractDate: string | null = null;
    let plannedStart: string;
    let plannedEnd: string;
    let actualStart: string | null = null;
    let actualEnd: string | null = null;
    let workEnd: string | null = null;

    switch (t.kind) {
      case "done": {
        const monthStart = addMonths(startOfMonth(today), t.endMonth);
        const lastDay = Number(endOfMonth(monthStart).slice(8));
        let end = weekdayBackward(`${monthStart.slice(0, 7)}-${String(Math.min(t.endDay, lastDay)).padStart(2, "0")}`);
        if (t.endMonth === 0) {
          end = minDate(end, weekdayBackward(addDays(today, -1)));
          if (end < monthStart) end = today;
        }
        let start = weekdayForward(addDays(end, -t.days));
        if (start > end) start = end;
        actualStart = start;
        actualEnd = end;
        workEnd = end;
        plannedStart = start;
        plannedEnd = addDays(end, -(t.delay ?? 0));
        if (plannedEnd < plannedStart) plannedEnd = plannedStart;
        contractDate = addDays(start, -rng.int(10, 30));
        createdDate = addDays(contractDate, -rng.int(7, 21));
        break;
      }
      case "active": {
        actualStart = weekdayBackward(addDays(today, -t.startedDaysAgo));
        workEnd = today;
        plannedStart = actualStart;
        plannedEnd = addDays(actualStart, t.plannedDays);
        contractDate = addDays(actualStart, -rng.int(14, 30));
        createdDate = addDays(contractDate, -rng.int(7, 14));
        break;
      }
      case "upcoming": {
        contractDate = addDays(today, -t.contractDaysAgo);
        createdDate = addDays(contractDate, -rng.int(7, 14));
        plannedStart = weekdayForward(addDays(today, t.startInDays));
        plannedEnd = addDays(plannedStart, t.plannedDays);
        break;
      }
      case "estimate": {
        createdDate = addDays(today, -t.estimateDaysAgo);
        plannedStart = weekdayForward(addDays(today, t.startInDays));
        plannedEnd = addDays(plannedStart, t.plannedDays);
        break;
      }
      case "lost": {
        createdDate = addDays(today, -t.estimateDaysAgo);
        plannedStart = weekdayForward(addDays(createdDate, 30));
        plannedEnd = addDays(plannedStart, t.plannedDays);
        break;
      }
    }

    const isOrder = spec.status !== "estimating" && spec.status !== "lost";
    const budgetCost = roundTo(spec.amount * spec.budgetRatio, 10_000);
    let targetCost = 0;
    if (t.kind === "done") targetCost = Math.round(budgetCost * spec.costRatio);
    if (t.kind === "active") targetCost = Math.round(budgetCost * spec.costRatio * (spec.progress ?? 0.5));
    if (spec.status === "preparing") targetCost = Math.round(budgetCost * COST_STRUCTURE[spec.type].material * 0.25);

    const laborBudget = t.kind === "done" || t.kind === "active" ? targetCost * COST_STRUCTURE[spec.type].labor : 0;

    return {
      spec,
      id: rng.uuid(),
      code: "",
      createdDate,
      contractDate,
      plannedStart,
      plannedEnd,
      actualStart,
      actualEnd,
      workEnd,
      contractAmount: isOrder ? spec.amount : null,
      estimateAmount: isOrder ? roundTo(spec.amount * (1 + rng.int(2, 8) / 100), 10_000) : spec.amount,
      budgetCost,
      targetCost,
      laborBudget,
      laborUsed: 0,
      workerKeys: [...new Set<EmployeeKey>([spec.siteManager, ...spec.members])],
    };
  });

  // 案件ID（PJ-年-連番）は登録日順に採番
  [...plans]
    .sort((a, b) => a.createdDate.localeCompare(b.createdDate))
    .forEach((plan, i) => {
      plan.code = `PJ-${plan.createdDate.slice(0, 4)}-${String(i + 1).padStart(4, "0")}`;
    });

  const projects: SeedRow[] = plans.map((p) => ({
    id: p.id,
    project_code: p.code,
    name: p.spec.name,
    customer_id: customerIds.get(p.spec.customer)!,
    site_address: customerAddress.get(p.spec.customer)!,
    construction_type: p.spec.type,
    sales_rep_id: employeeById(p.spec.salesRep),
    site_manager_id: employeeById(p.spec.siteManager),
    contract_amount: p.contractAmount,
    estimate_amount: p.estimateAmount,
    budget_cost: p.budgetCost,
    contract_date: p.contractDate,
    planned_start_date: p.plannedStart,
    planned_end_date: p.plannedEnd,
    actual_start_date: p.actualStart,
    actual_end_date: p.actualEnd,
    status: p.spec.status,
    memo: p.spec.memo ?? null,
    created_at: atNine(p.createdDate),
    updated_at: atNine(p.actualEnd ?? p.contractDate ?? p.createdDate),
  }));

  const projectMembers: SeedRow[] = plans.flatMap((p) =>
    p.spec.members
      .filter((key) => key !== p.spec.siteManager)
      .map((key) => ({ project_id: p.id, employee_id: employeeById(key), created_at: atNine(p.createdDate) })),
  );

  // ------------------------------------------------------------------ 勤怠（労務費の源泉）
  const firstStart = plans.reduce((min, p) => (p.actualStart && p.actualStart < min ? p.actualStart : min), today);
  const field = EMPLOYEES.filter((e) => e.attendance === "field" && e.status === "active");
  const office = EMPLOYEES.filter((e) => e.attendance === "office" && e.status === "active");
  const drafts: AttendanceDraft[] = [];

  const progressFraction = (plan: ProjectPlan, date: string) => {
    const start = plan.actualStart!;
    const end = plan.workEnd!;
    const span = Math.max(1, diffDays(end, start) + 1);
    return Math.min(1, Math.max(0, (diffDays(date, start) + 1) / span));
  };

  // 案件ごとの「1日あたりの必要人工」= 労務予算 ÷ 1人日の原価 ÷ 工期中の稼働日数
  const dailyQuota = new Map<string, number>();
  for (const plan of plans) {
    if (!plan.actualStart || !plan.workEnd || plan.laborBudget <= 0) continue;
    const avgRate = plan.workerKeys.reduce((s, k) => s + rateOf.get(k)!, 0) / plan.workerKeys.length;
    const workdays = Math.max(1, eachDay(plan.actualStart, plan.workEnd).filter(isWorkday).length);
    dailyQuota.set(plan.id, plan.laborBudget / (avgRate * 8.5) / workdays);
  }

  for (const date of eachDay(addDays(firstStart, -5), today)) {
    if (!isWorkday(date)) continue;
    const isToday = date === today;

    const present = field.filter((employee) => {
      if (isToday && (nowMinutes < 7 * 60 + 50 || employee.key === "tanaka")) return false; // デモ用: 田中は未出勤
      if (date === yesterdayWorkday && employee.key === "yoshida") return false; // 勤怠未入力のデモ
      return isToday || !rng.chance(0.03); // 有給休暇
    });

    // 工期中の案件に、進捗ペースから遅れている順で必要人数を割り当てる（工期中は毎日作業が続く）
    const assignment = new Map<EmployeeKey, ProjectPlan>();
    const activePlans = plans
      .filter((p) => dailyQuota.has(p.id) && date >= p.actualStart! && date <= p.workEnd!)
      .map((p) => ({ plan: p, deficit: progressFraction(p, date) - p.laborUsed / p.laborBudget }))
      .sort((a, b) => b.deficit - a.deficit);
    const available = (plan: ProjectPlan) =>
      rng.shuffle(plan.workerKeys.filter((k) => !assignment.has(k) && present.some((e) => e.key === k)));
    const working = activePlans.filter(({ deficit }) => deficit >= -0.08 || isToday); // 大きく先行している案件はこの日は休み
    // 1巡目: 各現場に最低1名（工期中は作業が途切れないように）
    for (const { plan } of working) {
      const [key] = available(plan);
      if (key) assignment.set(key, plan);
    }
    // 2巡目: 遅れている現場から必要人数まで追加
    for (const { plan, deficit } of working) {
      const quota = dailyQuota.get(plan.id)!;
      const backlog = Math.max(0, deficit) * quota * eachDay(plan.actualStart!, plan.workEnd!).length;
      const want = Math.max(1, Math.round(quota + backlog / 5));
      const already = [...assignment.values()].filter((p) => p === plan).length;
      for (const key of available(plan).slice(0, Math.max(0, want - already))) assignment.set(key, plan);
    }

    for (const employee of present) {
      const best = assignment.get(employee.key) ?? null;

      const inMinutes = rng.int(7 * 60 + 40, 8 * 60 + 10);
      const overtime = rng.chance(0.22) ? rng.int(45, 150) : 0;
      const outMinutes = 17 * 60 + rng.int(0, 40) + overtime;
      const breakMinutes = outMinutes - inMinutes > 11 * 60 ? 90 : 60;
      const missingClockOut = isToday || (date === yesterdayWorkday && employee.key === "kato");
      const workMinutes = missingClockOut ? null : Math.max(0, outMinutes - inMinutes - breakMinutes);

      if (best && workMinutes !== null) best.laborUsed += calcLaborCost(rateOf.get(employee.key)!, workMinutes);

      drafts.push({
        employee,
        date,
        projectId: best?.id ?? null,
        clockIn: jstToIso(date, hhmm(inMinutes)),
        clockOut: missingClockOut ? null : jstToIso(date, hhmm(outMinutes)),
        breakMinutes,
        workMinutes,
      });
    }

    for (const employee of office) {
      if (isToday && nowMinutes < 9 * 60) continue;
      if (!isToday && rng.chance(0.03)) continue;
      const inMinutes = rng.int(8 * 60 + 40, 8 * 60 + 58);
      const outMinutes = rng.int(17 * 60 + 30, 18 * 60 + 30);
      drafts.push({
        employee,
        date,
        projectId: null,
        clockIn: jstToIso(date, hhmm(inMinutes)),
        clockOut: isToday ? null : jstToIso(date, hhmm(outMinutes)),
        breakMinutes: 60,
        workMinutes: isToday ? null : outMinutes - inMinutes - 60,
      });
    }
  }

  const attendance: SeedRow[] = drafts.map((d) => ({
    id: rng.uuid(),
    employee_id: employeeById(d.employee.key),
    work_date: d.date,
    project_id: d.projectId,
    clock_in: d.clockIn,
    clock_out: d.clockOut,
    break_minutes: d.breakMinutes,
    note: d.projectId === null && d.employee.attendance === "field" ? "倉庫整理・資材準備" : null,
    created_at: d.clockIn,
    updated_at: d.clockOut ?? d.clockIn,
  }));

  // 案件ごとの実際の労務費（ビューと同じ計算）
  const laborByProject = new Map<string, number>();
  const attendanceDaysByProject = new Map<string, Set<string>>();
  for (const d of drafts) {
    if (!d.projectId) continue;
    if (d.workMinutes !== null) {
      const cost = calcLaborCost(rateOf.get(d.employee.key)!, d.workMinutes);
      laborByProject.set(d.projectId, (laborByProject.get(d.projectId) ?? 0) + cost);
    }
    if (!attendanceDaysByProject.has(d.projectId)) attendanceDaysByProject.set(d.projectId, new Set());
    attendanceDaysByProject.get(d.projectId)!.add(d.date);
  }

  // ------------------------------------------------------------------ 材料費・外注費・経費
  const materials: SeedRow[] = [];
  const outsourcingCosts: SeedRow[] = [];
  const expenses: SeedRow[] = [];
  const targetCosts: Record<string, number> = {};
  const materialNamesByProject = new Map<string, Array<{ name: string; unit: string }>>();

  const randomDateBetween = (from: string, to: string) => {
    const date = weekdayBackward(addDays(from, rng.int(0, Math.max(0, diffDays(to, from)))));
    return date < from ? from : date;
  };

  for (const plan of plans) {
    if (plan.targetCost <= 0) continue;
    const { spec } = plan;
    const createdBy = employeeById(spec.siteManager);
    const structure = COST_STRUCTURE[spec.type];
    const windowStart = plan.actualStart ?? addDays(today, -10);
    const windowEnd = plan.workEnd ?? today;
    targetCosts[spec.key] = plan.targetCost;

    const labor = laborByProject.get(plan.id) ?? 0;

    // その他経費（週ごとの駐車場・燃料・高速代 + 単発の処分費・重機・レンタル）
    const expenseDrafts: Array<{ date: string; category: ExpenseCategory; amount: number; memo: string; optional: boolean }> = [];
    if (plan.actualStart) {
      const days = [...(attendanceDaysByProject.get(plan.id) ?? [])].sort();
      const weeks = new Map<string, string[]>();
      for (const day of days) {
        const weekStart = addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
        weeks.set(weekStart, [...(weeks.get(weekStart) ?? []), day]);
      }
      for (const weekDays of weeks.values()) {
        const last = weekDays[weekDays.length - 1];
        if (rng.chance(0.5)) {
          expenseDrafts.push({ date: last, category: "parking", amount: roundTo(weekDays.length * rng.int(800, 1500), 10), memo: `コインパーキング ${weekDays.length}日分`, optional: true });
        }
        if (rng.chance(0.6)) {
          expenseDrafts.push({ date: last, category: "fuel", amount: roundTo(rng.int(4000, 9000), 10), memo: rng.pick(EXPENSE_MEMOS.fuel), optional: true });
        }
        if (rng.chance(0.15)) {
          expenseDrafts.push({ date: last, category: "highway", amount: roundTo(rng.int(1320, 3880), 10), memo: rng.pick(EXPENSE_MEMOS.highway), optional: true });
        }
      }
      if (spec.type !== "electrical" && spec.type !== "other") {
        expenseDrafts.push({ date: plan.actualEnd ? windowEnd : randomDateBetween(windowStart, windowEnd), category: "waste_disposal", amount: Math.max(18_000, roundTo(Math.min(plan.targetCost * 0.012, 120_000), 100)), memo: rng.pick(EXPENSE_MEMOS.waste_disposal), optional: false });
      }
      if ((spec.type === "electrical" || spec.type === "hvac" || spec.type === "roofing") && spec.amount >= 3_000_000) {
        expenseDrafts.push({ date: randomDateBetween(windowStart, windowEnd), category: "heavy_equipment", amount: rng.int(1, 3) * 25_000, memo: rng.pick(EXPENSE_MEMOS.heavy_equipment), optional: true });
      }
      if (rng.chance(0.3)) {
        expenseDrafts.push({ date: randomDateBetween(windowStart, windowEnd), category: "rental", amount: roundTo(rng.int(6000, 15000), 100), memo: rng.pick(EXPENSE_MEMOS.rental), optional: true });
      }
    }
    // 経費が原価目標を圧迫しないよう、任意項目を間引く
    let expenseTotal = expenseDrafts.reduce((s, e) => s + e.amount, 0);
    while (labor + expenseTotal > plan.targetCost * 0.9) {
      const index = expenseDrafts.findLastIndex((e) => e.optional);
      if (index < 0) break;
      expenseTotal -= expenseDrafts[index].amount;
      expenseDrafts.splice(index, 1);
    }

    // 材料費（カタログから数量×単価で積み上げ）
    const materialTarget =
      spec.status === "preparing"
        ? plan.targetCost
        : (Math.max(0, plan.targetCost - labor - expenseTotal) * structure.material) / (structure.material + structure.outsourcing) * 0.97;
    const catalog = MATERIAL_CATALOG[spec.type];
    let affordable = catalog.filter((item) => item.unitPrice <= materialTarget * 0.6);
    if (affordable.length === 0) affordable = [[...catalog].sort((a, b) => a.unitPrice - b.unitPrice)[0]];
    const chosen = rng.shuffle(affordable).slice(0, Math.min(affordable.length, rng.int(2, 6)));
    const weights = chosen.map(() => 0.5 + rng.next());
    const weightSum = weights.reduce((s, w) => s + w, 0);
    let materialTotal = 0;
    chosen.forEach((item, i) => {
      if (materialTarget <= 0) return;
      const quantity = Math.max(1, Math.round((materialTarget * weights[i]) / weightSum / item.unitPrice));
      materialTotal += quantity * item.unitPrice;
      const date =
        spec.status === "preparing"
          ? weekdayBackward(addDays(today, -rng.int(1, 10)))
          : i < chosen.length / 2
            ? weekdayForward(addDays(windowStart, rng.int(0, 3)))
            : randomDateBetween(windowStart, windowEnd);
      materials.push({
        id: rng.uuid(),
        project_id: plan.id,
        purchase_date: minDate(date, today),
        name: item.name,
        quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        supplier: item.supplier,
        memo: null,
        created_by: createdBy,
        created_at: atNine(minDate(date, today)),
        updated_at: atNine(minDate(date, today)),
      });
    });
    materialNamesByProject.set(plan.id, chosen.map((c) => ({ name: c.name, unit: c.unit })));

    // 外注費で目標原価との差額を吸収（端数が小さい場合は雑費として計上）
    if (spec.status !== "preparing") {
      const remainder = plan.targetCost - labor - expenseTotal - materialTotal;
      const vendors = OUTSOURCING_VENDORS[spec.type];
      if (remainder >= 20_000) {
        // 外注費は千円単位、端数は雑費として計上（目標原価に一致させる）
        const rounded = Math.floor(remainder / 1000) * 1000;
        if (remainder > rounded) {
          expenseDrafts.push({ date: windowEnd, category: "other", amount: remainder - rounded, memo: rng.pick(EXPENSE_MEMOS.other), optional: false });
        }
        const parts =
          rounded > 400_000 && vendors.length > 1
            ? (() => {
                const first = roundTo(rounded * (0.55 + rng.next() * 0.15), 1000);
                return [first, rounded - first];
              })()
            : [rounded];
        parts.forEach((amount, i) => {
          const vendor = vendors[i % vendors.length];
          const date = randomDateBetween(addDays(windowStart, Math.floor(diffDays(windowEnd, windowStart) / 3)), windowEnd);
          outsourcingCosts.push({
            id: rng.uuid(),
            project_id: plan.id,
            cost_date: date,
            vendor_name: vendor.vendor,
            description: vendor.description,
            amount,
            memo: null,
            created_by: createdBy,
            created_at: atNine(date),
            updated_at: atNine(date),
          });
        });
      } else if (remainder > 0) {
        expenseDrafts.push({ date: windowEnd, category: "other", amount: remainder, memo: rng.pick(EXPENSE_MEMOS.other), optional: false });
      }
    }

    for (const e of expenseDrafts) {
      expenses.push({
        id: rng.uuid(),
        project_id: plan.id,
        expense_date: e.date,
        category: e.category,
        amount: e.amount,
        memo: e.memo,
        created_by: createdBy,
        created_at: atNine(e.date),
        updated_at: atNine(e.date),
      });
    }
  }

  // ------------------------------------------------------------------ 現場日報（勤怠のある案件×日ごと）
  const groups = new Map<string, AttendanceDraft[]>();
  for (const d of drafts) {
    if (!d.projectId || d.date >= today) continue;
    const key = `${d.projectId}|${d.date}`;
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }

  // 日報未提出アラートのデモ: 直近の2件を意図的に未提出にする
  const skipKeys = new Set<string>();
  for (const specKey of ["hokuto2-power", "sunrise-2"]) {
    const plan = plans.find((p) => p.spec.key === specKey);
    if (!plan) continue;
    const recent = [...groups.keys()]
      .filter((k) => k.startsWith(`${plan.id}|`) && k.split("|")[1] >= addDays(today, -7))
      .sort()
      .reverse();
    if (recent[0]) skipKeys.add(recent[0]);
  }

  const planById = new Map(plans.map((p) => [p.id, p]));
  const dailyReports: SeedRow[] = [];
  const dailyReportWorkers: SeedRow[] = [];
  const dailyReportMaterials: SeedRow[] = [];
  const reportIdByProjectDate = new Map<string, string>();

  for (const [key, attendees] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (skipKeys.has(key)) continue;
    const [projectId, date] = key.split("|");
    const plan = planById.get(projectId)!;
    const { spec } = plan;

    const managerPresent = attendees.find((a) => a.employee.key === spec.siteManager);
    const others = attendees.filter((a) => a.employee.key !== spec.siteManager);
    const author = managerPresent && (others.length === 0 || rng.chance(0.72)) ? managerPresent : rng.pick(others.length ? others : attendees);

    const fraction = progressFraction(plan, date);
    const steps = WORK_STEPS[spec.type];
    // 工事中の案件は「経過日数」ではなく「出来高」に応じた工程の作業内容にする
    const workFraction = plan.actualEnd ? fraction : fraction * (spec.progress ?? 0.5);
    const stepIndex = Math.min(steps.length - 1, Math.floor(workFraction * steps.length));
    const isFinalDay = plan.actualEnd === date;
    const progress = plan.actualEnd
      ? isFinalDay
        ? 100
        : Math.min(99, Math.round(fraction * 100))
      : Math.min(99, Math.round(fraction * (spec.progress ?? 0.5) * 100));

    const lines = [`${steps[stepIndex]}を実施。`];
    if (attendees.length > 1) lines.push(`${attendees.length}名で作業。`);
    if (rng.chance(0.4)) lines.push(rng.pick(["作業後に清掃・片付けを実施。", "資材の残数を確認し発注依頼。", "施主様立会いのもと仕様を確認。", "安全通路を確保して作業。"]));

    const latestOut = attendees.reduce((max, a) => (a.clockOut && a.clockOut > max ? a.clockOut : max), "");
    const endTime = latestOut ? toJstTimeString(latestOut) : "17:00";
    const reportId = rng.uuid();
    const issueChance = spec.costRatio > 1.05 ? 0.25 : 0.08;

    dailyReports.push({
      id: reportId,
      project_id: projectId,
      report_date: date,
      author_id: employeeById(author.employee.key),
      start_time: "08:00",
      end_time: endTime > "08:30" ? endTime : "17:00",
      break_minutes: 60,
      work_content: lines.join("\n"),
      progress,
      issues: rng.chance(issueChance) ? rng.pick(ISSUE_TEMPLATES) : null,
      tomorrow_plan: isFinalDay
        ? "竣工書類の作成・提出"
        : stepIndex + 1 < steps.length && rng.chance(0.5)
          ? steps[stepIndex + 1]
          : `${steps[stepIndex]}（続き）`,
      notes: rng.chance(0.3) ? rng.pick(NOTE_TEMPLATES) : null,
      created_at: jstToIso(date, endTime > "17:15" ? endTime : "17:15"),
      updated_at: jstToIso(date, endTime > "17:15" ? endTime : "17:15"),
    });
    reportIdByProjectDate.set(key, reportId);

    for (const a of attendees) {
      dailyReportWorkers.push({ daily_report_id: reportId, employee_id: employeeById(a.employee.key) });
    }

    const usable = materialNamesByProject.get(projectId) ?? [];
    if (usable.length && rng.chance(0.35)) {
      rng
        .shuffle(usable)
        .slice(0, rng.int(1, 2))
        .forEach((m, i) => {
          dailyReportMaterials.push({
            id: rng.uuid(),
            daily_report_id: reportId,
            name: m.name,
            quantity: m.unit === "m" || m.unit === "㎡" ? rng.int(5, 60) : rng.int(1, 6),
            unit: m.unit,
            sort_order: i,
          });
        });
    }
  }

  // ------------------------------------------------------------------ 現場写真（サンプル画像）
  const projectPhotos: SeedRow[] = [];
  for (const plan of plans) {
    for (const photo of plan.spec.photos ?? []) {
      if (!plan.actualStart) continue;
      const end = plan.actualEnd ?? addDays(today, -1);
      const date =
        photo.phase === "before"
          ? plan.actualStart
          : photo.phase === "after"
            ? end
            : weekdayBackward(addDays(plan.actualStart, Math.floor(diffDays(end, plan.actualStart) / 2)));
      const file = SAMPLE_PHOTOS[photo.file];
      projectPhotos.push({
        id: rng.uuid(),
        project_id: plan.id,
        daily_report_id: reportIdByProjectDate.get(`${plan.id}|${date}`) ?? null,
        phase: photo.phase,
        storage_path: `seed/${plan.code}/${file}`,
        file_name: file,
        mime_type: "image/svg+xml",
        size_bytes: 2048,
        caption: photo.caption,
        uploaded_by: employeeById(plan.spec.siteManager),
        created_at: jstToIso(date, "16:30"),
        updated_at: jstToIso(date, "16:30"),
      });
    }
  }

  return {
    settings: {
      id: 1,
      company_name: COMPANY_NAME,
      standard_work_minutes: 480,
      default_break_minutes: 60,
      cost_alert_percent: 90,
    },
    departments,
    employees,
    employeeCostRates,
    authUsers,
    customers,
    projects,
    projectMembers,
    attendance,
    dailyReports,
    dailyReportWorkers,
    dailyReportMaterials,
    projectPhotos,
    materials,
    outsourcingCosts,
    expenses,
    sequences: {
      employee_code_seq: EMPLOYEES.length,
      customer_code_seq: CUSTOMERS.length,
      project_code_seq: plans.length,
    },
    targetCosts,
  };
}
