import { HammerIcon, PackageIcon, ReceiptIcon } from "lucide-react";
import Link from "next/link";

import { Yen } from "@/components/common/money";
import { COST_TYPE_LABELS, EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
import { formatNumber, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CostEntry } from "@/server/queries/costs";

const ICONS = { material: PackageIcon, outsourcing: HammerIcon, expense: ReceiptIcon } as const;
const ICON_CLASSES = {
  material: "bg-orange-50 text-orange-600",
  outsourcing: "bg-teal-50 text-teal-600",
  expense: "bg-amber-50 text-amber-700",
} as const;

export function costEntryTitle(entry: CostEntry): string {
  if (entry.type === "expense") return entry.category ? EXPENSE_CATEGORY_LABELS[entry.category] : "経費";
  return entry.title ?? "—";
}

/** 原価明細（材料費・外注費・経費を時系列で） */
export function CostEntryList({ entries }: { entries: CostEntry[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/8">
      {entries.map((e) => {
        const Icon = ICONS[e.type];
        return (
          <li key={`${e.type}-${e.id}`} className="flex items-center gap-3 px-4 py-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", ICON_CLASSES[e.type])}>
              <Icon className="size-4" aria-label={COST_TYPE_LABELS[e.type]} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {costEntryTitle(e)}
                {e.type === "material" && e.quantity !== null ? (
                  <span className="num ml-1.5 text-xs font-normal text-muted-foreground">
                    {formatNumber(e.quantity)}
                    {e.unit} × <Yen value={e.unitPrice} />
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                <span className="num">{formatShortDate(e.date)}</span> ・{" "}
                <Link href={`/projects/${e.projectId}`} className="hover:text-primary hover:underline">
                  {e.projectName}
                </Link>
                {e.detail ? ` ・ ${e.detail}` : ""}
              </p>
            </div>
            <div className="text-right">
              <Yen value={e.amount} className="text-sm font-semibold" />
              <p className="text-[11px] text-muted-foreground">{e.createdByName ?? ""}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
