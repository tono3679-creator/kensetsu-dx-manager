import { AppShell } from "@/components/layout/app-shell";
import { requireUser, withUser } from "@/server/auth/session";
import { isDemoMode, isPublicDemo } from "@/server/env";
import { getSettings } from "@/server/queries/common";

const BADGE = isDemoMode
  ? { label: "デモモード", title: "データはサーバーのメモリ上にあり、再起動で初期化されます" }
  : isPublicDemo
    ? { label: "公開デモ", title: "デモデータは毎日 4:00（日本時間）に初期化されます" }
    : null;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const settings = await withUser((db) => getSettings(db));

  return (
    <AppShell
      user={{ name: user.name, role: user.role, position: user.position, departmentName: user.departmentName }}
      companyName={settings.companyName}
      badge={BADGE}
    >
      {children}
    </AppShell>
  );
}
