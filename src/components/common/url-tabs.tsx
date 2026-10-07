"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
  content: ReactNode;
}

/**
 * タブ（選択中のタブは URL の ?tab= に反映。リロード・共有しても同じタブが開く）
 * 各タブの中身はサーバー側で描画済みのため切り替えは即時。
 */
export function UrlTabs({ tabs, defaultValue }: { tabs: TabItem[]; defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs defaultValue={defaultValue} onValueChange={onChange} className="gap-4">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <TabsList variant="line" className="h-10 w-max min-w-full justify-start border-b">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="h-9 flex-none px-3">
              {tab.label}
              {tab.count !== undefined ? (
                <span className="num rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">{tab.count}</span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
