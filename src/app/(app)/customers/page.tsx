import { ChevronRightIcon, ContactIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField } from "@/components/common/filter-bar";
import { Yen } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { enumParam, textParam } from "@/lib/search-params";
import { withUser } from "@/server/auth/session";
import { listCustomers } from "@/server/queries/customers";

export const metadata: Metadata = { title: "顧客管理" };

export default async function CustomersPage(props: PageProps<"/customers">) {
  const sp = await props.searchParams;
  const q = textParam(sp, "q");
  const sort = enumParam(sp, "sort", ["code", "revenue"] as const);
  const customers = await withUser((db) => listCustomers(db, { q, sort }), { roles: ["admin"] });
  const totalRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0);

  return (
    <>
      <PageHeader
        title="顧客管理"
        description="顧客ごとの過去案件と累計売上を確認できます。"
        actions={
          <Button asChild size="lg">
            <Link href="/customers/new">
              <PlusIcon aria-hidden />
              顧客を登録
            </Link>
          </Button>
        }
      />
      <FilterBar action="/customers" q={q} placeholder="顧客名・法人名・担当者・住所で検索" activeCount={sort ? 1 : 0}>
        <FilterField label="並び順" htmlFor="f-sort">
          <NativeSelect id="f-sort" name="sort" defaultValue={sort ?? "code"}>
            <option value="code">顧客コード順</option>
            <option value="revenue">累計売上が多い順</option>
          </NativeSelect>
        </FilterField>
      </FilterBar>

      <p className="mt-5 mb-3 text-sm text-muted-foreground">
        <span className="num text-base font-semibold text-foreground">{customers.length}</span> 社 ・ 累計売上合計 <Yen value={totalRevenue} className="font-semibold text-foreground" />
      </p>

      {customers.length === 0 ? (
        <EmptyState icon={ContactIcon} title={q ? "条件に一致する顧客がありません" : "顧客がまだ登録されていません"} />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl bg-card ring-1 ring-foreground/8 md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">顧客名</TableHead>
                  <TableHead>担当者 / 連絡先</TableHead>
                  <TableHead className="text-right">案件数</TableHead>
                  <TableHead className="text-right">累計売上</TableHead>
                  <TableHead className="pr-4">最終工事</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} className="group relative">
                    <TableCell className="max-w-80 pl-4">
                      <Link href={`/customers/${c.id}`} className="after:absolute after:inset-0">
                        <span className="block truncate font-medium group-hover:text-primary">{c.name}</span>
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">{c.corporateName ?? "個人"}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.contactPerson ?? "—"}
                      <span className="num block text-xs text-muted-foreground">{c.phone}</span>
                    </TableCell>
                    <TableCell className="num text-right">
                      {c.projectCount}件
                      {c.activeProjectCount ? <span className="block text-xs text-primary">進行中 {c.activeProjectCount}</span> : null}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Yen value={c.totalRevenue} />
                    </TableCell>
                    <TableCell className="num pr-4">{formatDate(c.lastProjectDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="grid gap-2 md:hidden">
            {customers.map((c) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/8">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.projectCount}件 ・ 累計 <Yen value={c.totalRevenue} />
                    </span>
                  </span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
