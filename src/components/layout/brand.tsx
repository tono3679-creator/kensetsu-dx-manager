import { HardHatIcon } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <HardHatIcon className="size-4.5" aria-hidden />
    </span>
  );
}

export function Brand({ companyName }: { companyName?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BrandMark />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-bold tracking-tight">{APP_NAME}</p>
        {companyName ? <p className="truncate text-xs text-muted-foreground">{companyName}</p> : null}
      </div>
    </div>
  );
}
