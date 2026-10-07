"use client";

import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangleIcon className="size-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-bold">データの読み込みに失敗しました</h1>
        <p className="text-sm text-muted-foreground">
          通信状況を確認のうえ、もう一度お試しください。解決しない場合は管理者にお問い合わせください。
        </p>
        {error.digest ? <p className="font-mono text-xs text-muted-foreground">エラーID: {error.digest}</p> : null}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset} size="lg">
          <RotateCcwIcon aria-hidden />
          再読み込み
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">ホームへ戻る</Link>
        </Button>
      </div>
    </div>
  );
}
