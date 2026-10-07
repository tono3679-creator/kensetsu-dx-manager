import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { SearchParams } from "@/lib/search-params";

function hrefFor(basePath: string, params: SearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined) continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (first) query.set(key, first);
  }
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** 前へ / 次へ のページ送り（検索条件は維持） */
export function Pagination({
  basePath,
  params,
  page,
  totalPages,
}: {
  basePath: string;
  params: SearchParams;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="ページ送り" className="flex items-center justify-center gap-3 pt-2">
      {page > 1 ? (
        <Button asChild variant="outline" size="lg">
          <Link href={hrefFor(basePath, params, page - 1)}>
            <ChevronLeftIcon aria-hidden />
            前へ
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="lg" disabled>
          <ChevronLeftIcon aria-hidden />
          前へ
        </Button>
      )}
      <span className="num text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Button asChild variant="outline" size="lg">
          <Link href={hrefFor(basePath, params, page + 1)}>
            次へ
            <ChevronRightIcon aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="lg" disabled>
          次へ
          <ChevronRightIcon aria-hidden />
        </Button>
      )}
    </nav>
  );
}
