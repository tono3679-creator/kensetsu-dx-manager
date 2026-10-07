import { BarChart3Icon, CalculatorIcon, ClipboardListIcon, ClockIcon, HardHatIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Brand } from "@/components/layout/brand";
import { APP_NAME } from "@/lib/constants";
import { param } from "@/lib/search-params";
import { getCurrentUser } from "@/server/auth/session";
import { isDemoMode, isPublicDemo } from "@/server/env";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "ログイン" };

const FEATURES = [
  { icon: ClipboardListIcon, title: "現場日報", text: "スマホから写真付きで1分入力" },
  { icon: ClockIcon, title: "勤怠打刻", text: "実働・残業時間を自動計算" },
  { icon: CalculatorIcon, title: "原価管理", text: "労務費は勤怠から自動で計上" },
  { icon: BarChart3Icon, title: "経営ダッシュボード", text: "売上・粗利をリアルタイムに把握" },
];

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const searchParams = await props.searchParams;
  const next = param(searchParams, "next");
  const showDemo = isDemoMode || isPublicDemo;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[oklch(0.3_0.09_262)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15">
            <HardHatIcon className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </div>
        <div className="relative max-w-lg space-y-6">
          <h1 className="text-4xl leading-tight font-bold tracking-tight text-balance">
            案件から利益まで、
            <br />
            現場と経営をひとつに。
          </h1>
          <p className="text-base leading-relaxed text-white/75">
            紙の日報、Excel の案件台帳、タイムカード。バラバラだった情報を案件IDでつなぎ、
            工事ごとの原価と利益をリアルタイムに見える化します。
          </p>
          <ul className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-xl bg-white/8 p-4 ring-1 ring-white/10">
                <Icon className="mb-2 size-5 text-sky-300" aria-hidden />
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs text-white/65">{text}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">中小建設会社・設備工事会社向け 業務DX管理システム</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-4">
            <div className="lg:hidden">
              <Brand companyName="中小建設会社向け 業務DX管理システム" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">ログイン</h2>
              <p className="text-sm text-muted-foreground">
                {showDemo
                  ? "デモ企業「株式会社山田設備」のデータで全機能をお試しいただけます。"
                  : "業務アカウントでログインしてください。"}
              </p>
              {isPublicDemo ? (
                <p className="text-xs text-muted-foreground">公開デモのため、データは毎日 4:00（日本時間）に初期状態へ戻ります。</p>
              ) : null}
            </div>
          </div>
          <LoginForm next={next} showDemoAccounts={showDemo} />
        </div>
      </section>
    </div>
  );
}
