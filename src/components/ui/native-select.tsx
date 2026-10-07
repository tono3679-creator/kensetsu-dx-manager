import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * ネイティブ <select> をスタイリングしたコンポーネント。
 * スマートフォンでは OS 標準のピッカーが開くため、現場での入力がしやすい。
 * フォーム送信（Server Actions / GET フィルター）にそのまま使える。
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        data-slot="native-select"
        className="h-10 w-full min-w-0 appearance-none rounded-lg border border-input bg-background py-1 pr-9 pl-2.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:h-9 md:text-sm"
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
