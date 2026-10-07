/**
 * デモモード（PGlite）用の Supabase 互換レイヤー。
 * Supabase に標準で存在するロール・auth スキーマ・auth.uid() を最小限再現し、
 * 本番と同じマイグレーション / RLS ポリシーをそのまま適用できるようにする。
 */
export const SUPABASE_SHIM_SQL = /* sql */ `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  encrypted_password text not null,
  created_at timestamptz not null default now()
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    ''
  )::uuid
$$;

create function auth.role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- デモモードの写真保存先（Supabase Storage の代替）。RLS 経由の認可後にシステム権限でのみ読み書きする
create schema demo_storage;
create table demo_storage.objects (
  path text primary key,
  mime_type text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
`;
