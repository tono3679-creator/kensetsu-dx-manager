import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  href?: string;
  /** 注意を引きたい KPI（未請求など） */
  emphasis?: "default" | "warning" | "danger";
  className?: string;
}

const EMPHASIS_CLASSES = {
  default: "bg-primary/8 text-primary",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
} as const;

export function KpiCard({ label, value, sub, icon: Icon, href, emphasis = "default", className }: KpiCardProps) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/8 transition-shadow md:p-5",
        href && "hover:shadow-md hover:ring-primary/25",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground md:text-sm">{label}</span>
        {Icon ? (
          <span className={cn("flex size-8 items-center justify-center rounded-lg", EMPHASIS_CLASSES[emphasis])}>
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="text-lg leading-tight font-bold tracking-tight sm:text-xl lg:text-2xl xl:text-xl 2xl:text-2xl">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}
