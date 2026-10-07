import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * GET フォームによる検索・絞り込みバー。
 * JavaScript なしでも動作し、条件は URL に残るため共有・ブックマークできる。
 */
export function FilterBar({
  action,
  q,
  placeholder = "キーワードで検索",
  activeCount,
  children,
  className,
}: {
  action: string;
  q?: string;
  placeholder?: string;
  /** 適用中のフィルター数（キーワード除く） */
  activeCount: number;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <form action={action} method="get" className={cn("rounded-xl bg-card p-3 ring-1 ring-foreground/8 md:p-4", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={q} placeholder={placeholder} className="pl-9" aria-label="キーワード" />
        </div>
        <Button type="submit" size="lg" className="md:h-9">
          検索
        </Button>
      </div>
      {children ? (
        <details className="group mt-3" open={activeCount > 0 ? true : undefined}>
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
            <SlidersHorizontalIcon className="size-4" aria-hidden />
            絞り込み
            {activeCount > 0 ? (
              <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{activeCount}</span>
            ) : null}
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button asChild variant="ghost" size="lg" className="md:h-9">
              <Link href={action}>
                <XIcon aria-hidden />
                条件をクリア
              </Link>
            </Button>
            <Button type="submit" size="lg" className="md:h-9">
              この条件で絞り込む
            </Button>
          </div>
        </details>
      ) : null}
    </form>
  );
}

export function FilterField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
