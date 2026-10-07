"use client";

import { LogOutIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import type { AppRole } from "@/types/domain";

import { Brand } from "./brand";
import { MOBILE_NAV, NAV_ITEMS, isActivePath, navLabel } from "./nav-items";

export interface ShellUser {
  name: string;
  role: AppRole;
  position: string | null;
  departmentName: string | null;
}

interface AppShellProps {
  user: ShellUser;
  companyName: string;
  /** ヘッダーに表示する動作モードのバッジ（デモモード / 公開デモ） */
  badge: { label: string; title: string } | null;
  children: ReactNode;
}

function Initials({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
    >
      {name.slice(0, 1)}
    </span>
  );
}

function NavList({ role, pathname, onNavigate }: { role: AppRole; pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="メインメニュー" className="space-y-0.5">
      {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-[18px]", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
            {navLabel(item, role)}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="ユーザーメニュー"
      >
        <Initials name={user.name} />
        <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{user.name}</p>
          <p className="text-xs font-normal text-muted-foreground">
            {ROLE_LABELS[user.role]}
            {user.position ? ` ・ ${user.position}` : ""}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOutIcon aria-hidden />
              ログアウト
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Server Action からリダイレクトした後のトースト表示（Cookie 経由のフラッシュメッセージ） */
function FlashToaster() {
  const pathname = usePathname();
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)kdx_flash=([^;]+)/);
    if (!match) return;
    document.cookie = "kdx_flash=; Max-Age=0; path=/";
    let message = match[1];
    try {
      message = decodeURIComponent(message);
    } catch {
      // 不正なエンコードはそのまま表示
    }
    toast.success(message);
  }, [pathname]);
  return null;
}

export function AppShell({ user, companyName, badge, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileItems = MOBILE_NAV[user.role];

  return (
    <div className="min-h-dvh">
      <FlashToaster />

      {/* PC: サイドバー */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Link href="/" className="min-w-0">
            <Brand companyName={companyName} />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavList role={user.role} pathname={pathname} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Initials name={user.name} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="md:pl-60">
        {/* ヘッダー */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:h-16 md:px-8">
          <Link href="/" className="min-w-0 md:hidden">
            <Brand />
          </Link>
          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <span className="truncate text-sm font-medium text-muted-foreground">{companyName}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {badge ? (
              <span
                className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-600/20 ring-inset sm:inline"
                title={badge.title}
              >
                {badge.label}
              </span>
            ) : null}
            <UserMenu user={user} />
          </div>
        </header>

        <main className="pb-mobile-nav mx-auto w-full max-w-7xl px-4 py-5 md:px-8 md:py-7 md:pb-12">{children}</main>
      </div>

      {/* スマートフォン: 下部ナビ */}
      <nav
        aria-label="モバイルナビゲーション"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden"
      >
        <div className="grid h-16 grid-cols-5">
          {mobileItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-[22px]" aria-hidden />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
          >
            <MenuIcon className="size-[22px]" aria-hidden />
            メニュー
          </button>
        </div>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle asChild>
              <div>
                <Brand companyName={companyName} />
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-3">
            <NavList role={user.role} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          </div>
          <div className="border-t p-3">
            <div className="mb-2 flex items-center gap-2.5 px-2">
              <Initials name={user.name} />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOutIcon className="size-[18px]" aria-hidden />
                ログアウト
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
