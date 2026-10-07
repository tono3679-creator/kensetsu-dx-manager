import {
  BarChart3Icon,
  Building2Icon,
  CalculatorIcon,
  ClipboardListIcon,
  ClockIcon,
  ContactIcon,
  HomeIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import type { AppRole } from "@/types/domain";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: readonly AppRole[];
  /** 権限ごとに表示名を変える場合 */
  labelFor?: Partial<Record<AppRole, string>>;
}

const ALL: readonly AppRole[] = ["admin", "manager", "staff"];

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboardIcon, roles: ALL, labelFor: { manager: "ホーム", staff: "ホーム" } },
  { href: "/projects", label: "案件管理", icon: Building2Icon, roles: ALL, labelFor: { staff: "担当現場" } },
  { href: "/daily-reports", label: "現場日報", icon: ClipboardListIcon, roles: ALL },
  { href: "/attendance", label: "勤怠管理", icon: ClockIcon, roles: ALL, labelFor: { staff: "勤怠・打刻" } },
  { href: "/costs", label: "原価管理", icon: CalculatorIcon, roles: ["admin", "manager"], labelFor: { manager: "材料費・経費" } },
  { href: "/employees", label: "従業員管理", icon: UsersIcon, roles: ["admin", "manager"], labelFor: { manager: "作業員" } },
  { href: "/customers", label: "顧客管理", icon: ContactIcon, roles: ["admin"] },
  { href: "/reports", label: "レポート", icon: BarChart3Icon, roles: ["admin"] },
  { href: "/settings", label: "設定", icon: SettingsIcon, roles: ["admin"] },
];

/** スマートフォン下部ナビ（よく使う4つ + メニュー） */
export const MOBILE_NAV: Record<AppRole, ReadonlyArray<{ href: string; label: string; icon: LucideIcon }>> = {
  admin: [
    { href: "/", label: "ホーム", icon: LayoutDashboardIcon },
    { href: "/projects", label: "案件", icon: Building2Icon },
    { href: "/daily-reports", label: "日報", icon: ClipboardListIcon },
    { href: "/attendance", label: "勤怠", icon: ClockIcon },
  ],
  manager: [
    { href: "/", label: "ホーム", icon: HomeIcon },
    { href: "/projects", label: "案件", icon: Building2Icon },
    { href: "/daily-reports", label: "日報", icon: ClipboardListIcon },
    { href: "/costs", label: "経費", icon: CalculatorIcon },
  ],
  staff: [
    { href: "/", label: "ホーム", icon: HomeIcon },
    { href: "/attendance", label: "打刻", icon: ClockIcon },
    { href: "/daily-reports", label: "日報", icon: ClipboardListIcon },
    { href: "/projects", label: "現場", icon: Building2Icon },
  ],
};

export function navLabel(item: NavItem, role: AppRole): string {
  return item.labelFor?.[role] ?? item.label;
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
