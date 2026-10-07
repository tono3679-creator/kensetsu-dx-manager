-- =============================================================================
-- Supabase Storage: 現場写真用の非公開バケット
--
--   バケットは非公開（public = false）で、anon / authenticated 向けのポリシーは作成しない。
--   アップロード・配信はサーバー側で行い、その前に project_photos テーブルへの
--   INSERT / SELECT をユーザー権限（RLS）で実行して認可を確認する。
--   ※ このファイルは Supabase 専用（ローカルのデモモード PGlite では適用しない）
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-photos',
  'project-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
