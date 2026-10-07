import { DatabaseIcon, RotateCcwIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";

import { ConfirmActionButton } from "@/components/common/confirm-action-button";
import { PageHeader } from "@/components/common/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants";
import { resetDemoDataAction } from "@/server/actions/settings";
import { withUser } from "@/server/auth/session";
import { isDemoMode, isPublicDemo } from "@/server/env";
import { getSettings, listDepartments } from "@/server/queries/common";

export const metadata: Metadata = { title: "設定" };

const PERMISSIONS: Array<{ feature: string; admin: string; manager: string; staff: string }> = [
  { feature: "経営ダッシュボード・レポート", admin: "○", manager: "—", staff: "—" },
  { feature: "案件", admin: "全件の閲覧・編集", manager: "担当案件の閲覧", staff: "担当現場の閲覧" },
  { feature: "現場日報", admin: "全件", manager: "担当案件の閲覧・登録", staff: "自分の日報の登録・閲覧" },
  { feature: "勤怠", admin: "全員の閲覧・修正", manager: "自分の打刻・担当現場の作業員", staff: "自分の打刻・履歴" },
  { feature: "原価（材料費・外注費・経費）", admin: "全件", manager: "担当案件の登録・閲覧", staff: "—" },
  { feature: "利益・時間原価", admin: "○", manager: "—", staff: "—" },
  { feature: "従業員・顧客・設定", admin: "○", manager: "従業員の閲覧のみ", staff: "—" },
];

export default async function SettingsPage() {
  const { settings, departments } = await withUser(
    async (db) => ({ settings: await getSettings(db), departments: await listDepartments(db) }),
    { roles: ["admin"] },
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="設定" description="会社情報と勤怠・原価の計算ルールを設定します。" />

      <Card>
        <CardHeader>
          <CardTitle>会社・計算ルール</CardTitle>
          <CardDescription>変更は保存後すぐに残業時間・原価アラートの計算に反映されます。</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4" aria-hidden />
            権限ごとの利用範囲
          </CardTitle>
          <CardDescription>画面の表示制御に加え、データベースの行レベルセキュリティ（RLS）で同じ範囲に制限しています。</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pl-6 font-medium">機能</th>
                <th className="py-2 font-medium">{ROLE_LABELS.admin}</th>
                <th className="py-2 font-medium">{ROLE_LABELS.manager}</th>
                <th className="py-2 pr-6 font-medium">{ROLE_LABELS.staff}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {PERMISSIONS.map((p) => (
                <tr key={p.feature}>
                  <td className="py-2.5 pl-6 font-medium">{p.feature}</td>
                  <td className="py-2.5">{p.admin}</td>
                  <td className="py-2.5">{p.manager}</td>
                  <td className="py-2.5 pr-6">{p.staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>部署</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {departments.map((d) => (
                <li key={d.id} className="py-2">
                  {d.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseIcon className="size-4" aria-hidden />
              システム
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <dl className="space-y-1.5">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">動作モード</dt>
                <dd className="font-medium">{isDemoMode ? "デモモード（PGlite）" : "本番モード（Supabase）"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">タイムゾーン</dt>
                <dd className="font-medium">日本時間（Asia/Tokyo）</dd>
              </div>
            </dl>
            {isDemoMode || isPublicDemo ? (
              <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-amber-900">
                <p className="text-xs">
                  {isDemoMode
                    ? "デモモードではデータはサーバーのメモリ上にあり、再起動または日付の変更で「今日」を基準にした初期データに戻ります。"
                    : "公開デモのデータは毎日 4:00（日本時間）に「今日」を基準にした初期データへ自動で戻ります。"}
                </p>
                <ConfirmActionButton
                  action={resetDemoDataAction}
                  title="デモデータを初期化しますか？"
                  description="登録・変更したデータはすべて削除され、初期状態のデモデータに戻ります。"
                  confirmLabel="初期化する"
                  trigger={
                    <Button variant="outline" size="sm" className="bg-white">
                      <RotateCcwIcon aria-hidden />
                      デモデータを初期化
                    </Button>
                  }
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
