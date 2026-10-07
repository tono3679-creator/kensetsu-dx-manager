import { LockIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "アクセス権限がありません" };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <LockIcon className="size-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-bold">このページを表示する権限がありません</h1>
        <p className="text-sm text-muted-foreground">
          必要な場合は管理者に権限の変更を依頼してください。
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/">ホームへ戻る</Link>
      </Button>
    </div>
  );
}
