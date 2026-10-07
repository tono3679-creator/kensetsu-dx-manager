import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { addMonths } from "@/lib/date";
import { formatMonth } from "@/lib/format";

/** 月の切り替え（"YYYY-MM" を ?month= で受け渡し） */
export function MonthSwitcher({ month, basePath, maxMonth }: { month: string; basePath: string; maxMonth: string }) {
  const prev = addMonths(`${month}-01`, -1).slice(0, 7);
  const next = addMonths(`${month}-01`, 1).slice(0, 7);
  const href = (m: string) => `${basePath}${basePath.includes("?") ? "&" : "?"}month=${m}`;
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-card p-1 ring-1 ring-foreground/8">
      <Button asChild variant="ghost" size="icon-lg" aria-label="前の月">
        <Link href={href(prev)}>
          <ChevronLeftIcon />
        </Link>
      </Button>
      <span className="num min-w-28 text-center text-sm font-semibold">{formatMonth(month)}</span>
      {next <= maxMonth ? (
        <Button asChild variant="ghost" size="icon-lg" aria-label="次の月">
          <Link href={href(next)}>
            <ChevronRightIcon />
          </Link>
        </Button>
      ) : (
        <Button variant="ghost" size="icon-lg" disabled aria-label="次の月">
          <ChevronRightIcon />
        </Button>
      )}
    </div>
  );
}
