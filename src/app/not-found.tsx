import { SearchXIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchXIcon className="size-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-bold">ページが見つかりません</h1>
        <p className="text-sm text-muted-foreground">
          URL が間違っているか、データが削除された可能性があります。アクセス権限のないデータも表示されません。
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/">ホームへ戻る</Link>
      </Button>
    </div>
  );
}
