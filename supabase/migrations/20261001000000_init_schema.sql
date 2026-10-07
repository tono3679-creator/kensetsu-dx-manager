-- =============================================================================
-- 建設DX Manager : 初期スキーマ
--   * 金額は numeric(14,0)（円単位の整数を10進数で厳密に保持。浮動小数点誤差なし）
--   * 数量・単価は numeric(10,2)/(12,2)
--   * 日時は timestamptz、日付は date（業務日付は日本時間基準）
--   * すべての業務テーブルに created_at / updated_at（updated_at はトリガーで自動更新）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 列挙型
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'manager', 'staff');
create type public.employment_status as enum ('active', 'on_leave', 'retired');
create type public.construction_type as enum (
  'electrical', 'hvac', 'plumbing', 'renovation', 'painting', 'roofing', 'other'
);
create type public.project_status as enum (
  'estimating', 'ordered', 'preparing', 'in_progress', 'completed', 'invoiced', 'paid', 'lost'
);
create type public.expense_category as enum (
  'parking', 'highway', 'fuel', 'heavy_equipment', 'rental', 'waste_disposal', 'other'
);
create type public.photo_phase as enum ('before', 'during', 'after');

-- -----------------------------------------------------------------------------
-- 共通トリガー: updated_at 自動更新
-- -----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 会社設定（1行のみ）
-- -----------------------------------------------------------------------------
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  company_name text not null check (char_length(company_name) between 1 and 100),
  standard_work_minutes integer not null default 480
    check (standard_work_minutes between 60 and 1440),           -- 所定労働時間（分）
  default_break_minutes integer not null default 60
    check (default_break_minutes between 0 and 240),             -- 既定の休憩時間（分）
  cost_alert_percent integer not null default 90
    check (cost_alert_percent between 50 and 100),               -- 原価アラート閾値（予算比 %）
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 部署
-- -----------------------------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 50),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 従業員
-- -----------------------------------------------------------------------------
create sequence public.employee_code_seq;

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique
    default ('E' || lpad(nextval('public.employee_code_seq')::text, 4, '0')),
  last_name text not null check (char_length(last_name) between 1 and 30),
  first_name text not null check (char_length(first_name) between 1 and 30),
  last_name_kana text check (char_length(last_name_kana) <= 30),
  first_name_kana text check (char_length(first_name_kana) <= 30),
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text check (char_length(phone) <= 20),
  department_id uuid references public.departments (id) on delete set null,
  position text check (char_length(position) <= 30),
  role public.app_role not null default 'staff',
  hire_date date,
  employment_status public.employment_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index employees_email_key on public.employees (lower(email));
create index employees_department_id_idx on public.employees (department_id);
create index employees_status_idx on public.employees (employment_status);

-- 時間あたり社内原価（給与関連のため管理者のみ参照可能な別テーブルに分離）
create table public.employee_cost_rates (
  employee_id uuid primary key references public.employees (id) on delete cascade,
  hourly_cost numeric(10, 0) not null check (hourly_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- ログインユーザー（Supabase Auth のユーザーと従業員を1対1で紐付け）
-- -----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  employee_id uuid not null unique references public.employees (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 顧客
-- -----------------------------------------------------------------------------
create sequence public.customer_code_seq;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique
    default ('C' || lpad(nextval('public.customer_code_seq')::text, 4, '0')),
  name text not null check (char_length(name) between 1 and 100),          -- 顧客名（表示名）
  corporate_name text check (char_length(corporate_name) <= 100),          -- 法人名
  contact_person text check (char_length(contact_person) <= 50),           -- 先方担当者
  phone text check (char_length(phone) <= 20),
  email text check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{3}-?[0-9]{4}$'),
  address text check (char_length(address) <= 200),
  memo text check (char_length(memo) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_name_idx on public.customers (name);

-- -----------------------------------------------------------------------------
-- 案件（工事）
-- -----------------------------------------------------------------------------
create sequence public.project_code_seq;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique
    default ('PJ-' || to_char(now() at time zone 'Asia/Tokyo', 'YYYY') || '-'
             || lpad(nextval('public.project_code_seq')::text, 4, '0')),
  name text not null check (char_length(name) between 1 and 200),
  customer_id uuid not null references public.customers (id) on delete restrict,
  site_address text check (char_length(site_address) <= 200),
  construction_type public.construction_type not null,
  sales_rep_id uuid references public.employees (id) on delete set null,     -- 担当者
  site_manager_id uuid references public.employees (id) on delete set null,  -- 現場責任者
  contract_amount numeric(14, 0) check (contract_amount >= 0),              -- 受注金額
  estimate_amount numeric(14, 0) check (estimate_amount >= 0),              -- 見積金額
  budget_cost numeric(14, 0) check (budget_cost >= 0),                      -- 予算原価
  contract_date date,
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  status public.project_status not null default 'estimating',
  memo text check (char_length(memo) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_planned_period_check
    check (planned_start_date is null or planned_end_date is null or planned_end_date >= planned_start_date),
  constraint projects_actual_period_check
    check (actual_start_date is null or actual_end_date is null or actual_end_date >= actual_start_date),
  -- 着工済みステータスには実際の着工日が必須
  constraint projects_started_requires_start_date
    check (status not in ('in_progress', 'completed', 'invoiced', 'paid') or actual_start_date is not null),
  -- 完工以降のステータスには実際の完工日が必須（売上計上日の根拠）
  constraint projects_completed_requires_end_date
    check (status not in ('completed', 'invoiced', 'paid') or actual_end_date is not null)
);

create index projects_customer_id_idx on public.projects (customer_id);
create index projects_sales_rep_id_idx on public.projects (sales_rep_id);
create index projects_site_manager_id_idx on public.projects (site_manager_id);
create index projects_status_idx on public.projects (status);
create index projects_planned_end_date_idx on public.projects (planned_end_date);
create index projects_actual_end_date_idx on public.projects (actual_end_date);

-- 案件メンバー（作業員のアサイン）
create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, employee_id)
);

create index project_members_employee_id_idx on public.project_members (employee_id);

-- -----------------------------------------------------------------------------
-- 現場日報
-- -----------------------------------------------------------------------------
create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  report_date date not null,
  author_id uuid not null references public.employees (id) on delete restrict,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 60 check (break_minutes between 0 and 600),
  work_content text not null check (char_length(work_content) between 1 and 4000),
  progress smallint not null default 0 check (progress between 0 and 100),   -- 作業進捗 %
  issues text check (char_length(issues) <= 2000),                          -- 問題・トラブル
  tomorrow_plan text check (char_length(tomorrow_plan) <= 2000),            -- 明日の予定
  notes text check (char_length(notes) <= 2000),                            -- 備考
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_reports_time_check check (end_time > start_time),
  constraint daily_reports_project_author_date_key unique (project_id, author_id, report_date)
);

create index daily_reports_project_date_idx on public.daily_reports (project_id, report_date desc);
create index daily_reports_author_date_idx on public.daily_reports (author_id, report_date desc);
create index daily_reports_report_date_idx on public.daily_reports (report_date desc);

-- 日報の作業者（複数）
create table public.daily_report_workers (
  daily_report_id uuid not null references public.daily_reports (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (daily_report_id, employee_id)
);

create index daily_report_workers_employee_id_idx on public.daily_report_workers (employee_id);

-- 日報の使用材料（記録用。仕入金額は materials で管理）
create table public.daily_report_materials (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references public.daily_reports (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  quantity numeric(10, 2) not null check (quantity > 0),
  unit text check (char_length(unit) <= 10),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index daily_report_materials_report_id_idx on public.daily_report_materials (daily_report_id);

-- 現場写真
create table public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  daily_report_id uuid references public.daily_reports (id) on delete set null,
  phase public.photo_phase not null,
  storage_path text not null unique,
  file_name text check (char_length(file_name) <= 200),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/svg+xml')),
  size_bytes integer check (size_bytes >= 0),
  caption text check (char_length(caption) <= 200),
  uploaded_by uuid references public.employees (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_photos_project_id_idx on public.project_photos (project_id, created_at desc);
create index project_photos_daily_report_id_idx on public.project_photos (daily_report_id);

-- -----------------------------------------------------------------------------
-- 勤怠
--   実働時間（分）= 退勤 - 出勤 - 休憩 を生成列で自動計算
--   残業時間は所定労働時間（settings）との差分としてビューで算出
-- -----------------------------------------------------------------------------
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  work_date date not null,
  project_id uuid references public.projects (id) on delete set null,   -- 担当案件
  clock_in timestamptz not null,
  clock_out timestamptz,
  break_minutes integer not null default 60 check (break_minutes between 0 and 600),
  work_minutes integer generated always as (
    case
      when clock_out is null then null
      else greatest(0, floor(extract(epoch from (clock_out - clock_in)) / 60)::integer - break_minutes)
    end
  ) stored,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_employee_date_key unique (employee_id, work_date),
  constraint attendance_clock_check check (clock_out is null or clock_out > clock_in)
);

create index attendance_work_date_idx on public.attendance (work_date);
create index attendance_project_date_idx on public.attendance (project_id, work_date);

-- -----------------------------------------------------------------------------
-- 原価: 材料費 / 外注費 / その他経費
-- -----------------------------------------------------------------------------
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  purchase_date date not null,
  name text not null check (char_length(name) between 1 and 100),
  quantity numeric(10, 2) not null check (quantity > 0),
  unit text check (char_length(unit) <= 10),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  amount numeric(14, 0) generated always as (round(quantity * unit_price)) stored,  -- 金額 = 数量 × 単価（円未満四捨五入）
  supplier text check (char_length(supplier) <= 100),
  memo text check (char_length(memo) <= 500),
  created_by uuid references public.employees (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index materials_project_date_idx on public.materials (project_id, purchase_date desc);
create index materials_purchase_date_idx on public.materials (purchase_date);

create table public.outsourcing_costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  cost_date date not null,
  vendor_name text not null check (char_length(vendor_name) between 1 and 100),   -- 外注先
  description text not null check (char_length(description) between 1 and 200),  -- 作業内容
  amount numeric(14, 0) not null check (amount >= 0),
  memo text check (char_length(memo) <= 500),
  created_by uuid references public.employees (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outsourcing_costs_project_date_idx on public.outsourcing_costs (project_id, cost_date desc);
create index outsourcing_costs_cost_date_idx on public.outsourcing_costs (cost_date);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  expense_date date not null,
  category public.expense_category not null,
  amount numeric(14, 0) not null check (amount >= 0),
  memo text check (char_length(memo) <= 500),
  created_by uuid references public.employees (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_project_date_idx on public.expenses (project_id, expense_date desc);
create index expenses_expense_date_idx on public.expenses (expense_date);

-- created_by の外部キー用インデックス
create index materials_created_by_idx on public.materials (created_by);
create index outsourcing_costs_created_by_idx on public.outsourcing_costs (created_by);
create index expenses_created_by_idx on public.expenses (created_by);
create index project_photos_uploaded_by_idx on public.project_photos (uploaded_by);

-- -----------------------------------------------------------------------------
-- updated_at トリガー
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'settings', 'departments', 'employees', 'employee_cost_rates', 'users', 'customers',
    'projects', 'project_members', 'daily_reports', 'daily_report_workers',
    'daily_report_materials', 'project_photos', 'attendance', 'materials',
    'outsourcing_costs', 'expenses'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;
