-- =============================================================================
-- 集計ビュー
--   security_invoker = true により、ビュー経由でも呼び出しユーザーの RLS が適用される。
--   （時間原価は管理者のみ参照可能なため、管理者以外が参照すると労務費は NULL/0 になる）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 勤怠 + 残業時間 + 労務費
--   残業時間 = max(0, 実働時間 - 所定労働時間)
--   労務費   = round(時間原価 × 実働分 ÷ 60)
-- -----------------------------------------------------------------------------
create view public.v_attendance
with (security_invoker = true)
as
select
  a.id,
  a.employee_id,
  a.work_date,
  a.project_id,
  a.clock_in,
  a.clock_out,
  a.break_minutes,
  a.work_minutes,
  a.note,
  a.created_at,
  a.updated_at,
  case
    when a.work_minutes is null then null
    else greatest(0, a.work_minutes - s.standard_work_minutes)
  end as overtime_minutes,
  r.hourly_cost,
  case
    when a.work_minutes is null or r.hourly_cost is null then null
    else round(r.hourly_cost * a.work_minutes / 60.0)
  end as labor_cost
from public.attendance a
cross join public.settings s
left join public.employee_cost_rates r on r.employee_id = a.employee_id;

-- -----------------------------------------------------------------------------
-- 案件別原価・粗利益・利益率
--   総原価   = 労務費 + 材料費 + 外注費 + その他経費
--   粗利益   = 受注金額 - 総原価
--   利益率   = 粗利益 ÷ 受注金額 × 100（小数第1位で四捨五入）
--   予算消化率 = 総原価 ÷ 予算原価 × 100
-- -----------------------------------------------------------------------------
create view public.v_project_costs
with (security_invoker = true)
as
select
  p.id as project_id,
  c.labor_minutes,
  c.labor_cost,
  c.material_cost,
  c.outsourcing_cost,
  c.expense_cost,
  c.total_cost,
  case
    when p.contract_amount is null then null
    else p.contract_amount - c.total_cost
  end as gross_profit,
  case
    when coalesce(p.contract_amount, 0) = 0 then null
    else round((p.contract_amount - c.total_cost) * 100.0 / p.contract_amount, 1)
  end as profit_rate,
  case
    when coalesce(p.budget_cost, 0) = 0 then null
    else round(c.total_cost * 100.0 / p.budget_cost, 1)
  end as budget_usage_rate
from public.projects p
cross join lateral (
  select
    l.labor_minutes,
    l.labor_cost,
    m.material_cost,
    o.outsourcing_cost,
    e.expense_cost,
    l.labor_cost + m.material_cost + o.outsourcing_cost + e.expense_cost as total_cost
  from
    (
      select
        coalesce(sum(a.work_minutes), 0)::integer as labor_minutes,
        coalesce(sum(round(r.hourly_cost * a.work_minutes / 60.0)), 0) as labor_cost
      from public.attendance a
      left join public.employee_cost_rates r on r.employee_id = a.employee_id
      where a.project_id = p.id and a.work_minutes is not null
    ) l,
    (select coalesce(sum(amount), 0) as material_cost from public.materials where project_id = p.id) m,
    (select coalesce(sum(amount), 0) as outsourcing_cost from public.outsourcing_costs where project_id = p.id) o,
    (select coalesce(sum(amount), 0) as expense_cost from public.expenses where project_id = p.id) e
) c;
