import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, backHref, backLabel, children, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        {backHref ? (
          <Link
            href={backHref}
            className="-ml-1 inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
            {backLabel ?? "戻る"}
          </Link>
        ) : null}
        <h1 className="text-xl font-bold tracking-tight text-balance md:text-2xl">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
