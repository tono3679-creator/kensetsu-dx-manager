-- =============================================================================
-- 行レベルセキュリティ (RLS)
--
--   権限        | 主なアクセス範囲
--   ------------+-----------------------------------------------------------
--   admin       | 全データの閲覧・編集
--   manager     | 担当案件（現場責任者/担当者/メンバー）の閲覧、日報、作業員の勤怠、
--               | 材料費・外注費・経費の登録
--   staff       | 自分の勤怠、担当現場の閲覧、日報の登録、自分の日報・勤務履歴
--
-- 判定用の関数は API 非公開の private スキーマに security definer で定義し、
-- RLS の再帰評価を避けつつ auth.uid() から従業員・権限を解決する。
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ログイン中ユーザーの従業員ID
create function private.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.employee_id
  from public.users u
  join public.employees e on e.id = u.employee_id
  where u.id = auth.uid()
    and e.employment_status <> 'retired'
$$;

-- ログイン中ユーザーの権限（退職者は NULL = アクセス不可）
create function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select e.role
  from public.users u
  join public.employees e on e.id = u.employee_id
  where u.id = auth.uid()
    and e.employment_status <> 'retired'
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'admin', false)
$$;

create function private.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'manager', false)
$$;

-- 案件へのアクセス可否（管理者 / 現場責任者・担当者 / 案件メンバー）
create function private.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and private.current_employee_id() in (p.site_manager_id, p.sales_rep_id)
    )
    or exists (
      select 1
      from public.project_members m
      where m.project_id = p_project_id
        and m.employee_id = private.current_employee_id()
    )
$$;

-- 日報の作業者として登録されているか（日報 ⇔ 作業者 のポリシー相互参照による再帰を回避）
create function private.is_daily_report_worker(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.daily_report_workers w
    where w.daily_report_id = p_report_id
      and w.employee_id = private.current_employee_id()
  )
$$;

-- 日本時間の「今日」
create function private.today_jst()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Tokyo')::date
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- -----------------------------------------------------------------------------
-- テーブル権限（anon は一切アクセス不可。authenticated も RLS で絞り込む）
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.settings enable row level security;
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.employee_cost_rates enable row level security;
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.daily_reports enable row level security;
alter table public.daily_report_workers enable row level security;
alter table public.daily_report_materials enable row level security;
alter table public.project_photos enable row level security;
alter table public.attendance enable row level security;
alter table public.materials enable row level security;
alter table public.outsourcing_costs enable row level security;
alter table public.expenses enable row level security;

-- -----------------------------------------------------------------------------
-- settings / departments: 全員閲覧、管理者のみ編集
-- -----------------------------------------------------------------------------
create policy settings_select on public.settings
  for select to authenticated using ((select private.current_app_role()) is not null);
create policy settings_update on public.settings
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy departments_select on public.departments
  for select to authenticated using ((select private.current_app_role()) is not null);
create policy departments_write on public.departments
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- employees: 社内名簿として在籍者全員が閲覧可、編集は管理者のみ
-- employee_cost_rates: 管理者のみ
-- users: 本人と管理者のみ閲覧、編集は管理者のみ
-- -----------------------------------------------------------------------------
create policy employees_select on public.employees
  for select to authenticated using ((select private.current_app_role()) is not null);
create policy employees_insert on public.employees
  for insert to authenticated with check ((select private.is_admin()));
create policy employees_update on public.employees
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy employees_delete on public.employees
  for delete to authenticated using ((select private.is_admin()));

create policy employee_cost_rates_admin on public.employee_cost_rates
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy users_select on public.users
  for select to authenticated using (id = (select auth.uid()) or (select private.is_admin()));
create policy users_write on public.users
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- customers: 管理者は全件、その他は担当案件の顧客のみ閲覧
-- -----------------------------------------------------------------------------
create policy customers_select on public.customers
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.projects p
      where p.customer_id = customers.id and private.can_access_project(p.id)
    )
  );
create policy customers_insert on public.customers
  for insert to authenticated with check ((select private.is_admin()));
create policy customers_update on public.customers
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy customers_delete on public.customers
  for delete to authenticated using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- projects / project_members: アクセス可能な案件のみ閲覧、編集は管理者のみ
-- -----------------------------------------------------------------------------
create policy projects_select on public.projects
  for select to authenticated using (private.can_access_project(id));
create policy projects_insert on public.projects
  for insert to authenticated with check ((select private.is_admin()));
create policy projects_update on public.projects
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy projects_delete on public.projects
  for delete to authenticated using ((select private.is_admin()));

create policy project_members_select on public.project_members
  for select to authenticated using (private.can_access_project(project_id));
create policy project_members_insert on public.project_members
  for insert to authenticated with check ((select private.is_admin()));
create policy project_members_update on public.project_members
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy project_members_delete on public.project_members
  for delete to authenticated using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- daily_reports
--   閲覧: 管理者 / 現場責任者は担当案件の日報 / スタッフは自分が作成・参加した日報
--   登録: 担当案件に対して本人名義でのみ登録可（管理者は代理登録可）
--   更新・削除: 作成者本人または管理者
-- -----------------------------------------------------------------------------
create policy daily_reports_select on public.daily_reports
  for select to authenticated
  using (
    (select private.is_admin())
    or ((select private.is_manager()) and private.can_access_project(project_id))
    or author_id = (select private.current_employee_id())
    or private.is_daily_report_worker(id)
  );
create policy daily_reports_insert on public.daily_reports
  for insert to authenticated
  with check (
    (select private.is_admin())
    or (author_id = (select private.current_employee_id()) and private.can_access_project(project_id))
  );
create policy daily_reports_update on public.daily_reports
  for update to authenticated
  using ((select private.is_admin()) or author_id = (select private.current_employee_id()))
  with check (
    (select private.is_admin())
    or (author_id = (select private.current_employee_id()) and private.can_access_project(project_id))
  );
create policy daily_reports_delete on public.daily_reports
  for delete to authenticated
  using ((select private.is_admin()) or author_id = (select private.current_employee_id()));

-- 日報の子テーブル: 親日報の閲覧権限に従い、編集は親日報の作成者または管理者
create policy daily_report_workers_select on public.daily_report_workers
  for select to authenticated
  using (exists (select 1 from public.daily_reports r where r.id = daily_report_id));
create policy daily_report_workers_write on public.daily_report_workers
  for all to authenticated
  using (
    exists (
      select 1 from public.daily_reports r
      where r.id = daily_report_id
        and ((select private.is_admin()) or r.author_id = (select private.current_employee_id()))
    )
  )
  with check (
    exists (
      select 1 from public.daily_reports r
      where r.id = daily_report_id
        and ((select private.is_admin()) or r.author_id = (select private.current_employee_id()))
    )
  );

create policy daily_report_materials_select on public.daily_report_materials
  for select to authenticated
  using (exists (select 1 from public.daily_reports r where r.id = daily_report_id));
create policy daily_report_materials_write on public.daily_report_materials
  for all to authenticated
  using (
    exists (
      select 1 from public.daily_reports r
      where r.id = daily_report_id
        and ((select private.is_admin()) or r.author_id = (select private.current_employee_id()))
    )
  )
  with check (
    exists (
      select 1 from public.daily_reports r
      where r.id = daily_report_id
        and ((select private.is_admin()) or r.author_id = (select private.current_employee_id()))
    )
  );

-- -----------------------------------------------------------------------------
-- project_photos: 案件にアクセスできるユーザーが閲覧・登録、削除は登録者または管理者
-- -----------------------------------------------------------------------------
create policy project_photos_select on public.project_photos
  for select to authenticated using (private.can_access_project(project_id));
create policy project_photos_insert on public.project_photos
  for insert to authenticated
  with check (
    private.can_access_project(project_id)
    and uploaded_by = (select private.current_employee_id())
  );
create policy project_photos_update on public.project_photos
  for update to authenticated
  using ((select private.is_admin()) or uploaded_by = (select private.current_employee_id()))
  with check ((select private.is_admin()) or uploaded_by = (select private.current_employee_id()));
create policy project_photos_delete on public.project_photos
  for delete to authenticated
  using ((select private.is_admin()) or uploaded_by = (select private.current_employee_id()));

-- -----------------------------------------------------------------------------
-- attendance
--   閲覧: 管理者 / 本人 / 現場責任者は担当案件の作業員勤怠
--   登録・更新: 本人は当日・前日分のみ（打刻・退勤漏れの修正）、管理者は全件
--   削除: 管理者のみ
-- -----------------------------------------------------------------------------
create policy attendance_select on public.attendance
  for select to authenticated
  using (
    (select private.is_admin())
    or employee_id = (select private.current_employee_id())
    or (
      (select private.is_manager())
      and project_id is not null
      and private.can_access_project(project_id)
    )
  );
create policy attendance_insert on public.attendance
  for insert to authenticated
  with check (
    (select private.is_admin())
    or (
      employee_id = (select private.current_employee_id())
      and work_date >= (select private.today_jst()) - 1
      and work_date <= (select private.today_jst())
      and (project_id is null or private.can_access_project(project_id))
    )
  );
create policy attendance_update on public.attendance
  for update to authenticated
  using (
    (select private.is_admin())
    or (
      employee_id = (select private.current_employee_id())
      and work_date >= (select private.today_jst()) - 1
    )
  )
  with check (
    (select private.is_admin())
    or (
      employee_id = (select private.current_employee_id())
      and work_date >= (select private.today_jst()) - 1
      and work_date <= (select private.today_jst())
      and (project_id is null or private.can_access_project(project_id))
    )
  );
create policy attendance_delete on public.attendance
  for delete to authenticated using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- 材料費 / 外注費 / その他経費
--   閲覧: 管理者 / 現場責任者は担当案件分
--   登録: 管理者 / 現場責任者は担当案件に本人名義で
--   更新・削除: 管理者 / 登録した現場責任者本人
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['materials', 'outsourcing_costs', 'expenses']
  loop
    execute format($f$
      create policy %1$s_select on public.%1$I
        for select to authenticated
        using (
          (select private.is_admin())
          or ((select private.is_manager()) and private.can_access_project(project_id))
        )
    $f$, t);

    execute format($f$
      create policy %1$s_insert on public.%1$I
        for insert to authenticated
        with check (
          (select private.is_admin())
          or (
            (select private.is_manager())
            and private.can_access_project(project_id)
            and created_by = (select private.current_employee_id())
          )
        )
    $f$, t);

    execute format($f$
      create policy %1$s_update on public.%1$I
        for update to authenticated
        using (
          (select private.is_admin())
          or ((select private.is_manager()) and created_by = (select private.current_employee_id()))
        )
        with check (
          (select private.is_admin())
          or (
            (select private.is_manager())
            and private.can_access_project(project_id)
            and created_by = (select private.current_employee_id())
          )
        )
    $f$, t);

    execute format($f$
      create policy %1$s_delete on public.%1$I
        for delete to authenticated
        using (
          (select private.is_admin())
          or ((select private.is_manager()) and created_by = (select private.current_employee_id()))
        )
    $f$, t);
  end loop;
end;
$$;

-- ビューの権限（security_invoker のため基礎テーブルの RLS が適用される）
revoke all on public.v_attendance, public.v_project_costs from anon;
grant select on public.v_attendance, public.v_project_costs to authenticated;
