import { ChevronRightIcon, PlusIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmploymentStatusBadge, RoleBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField } from "@/components/common/filter-bar";
import { Yen } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EMPLOYMENT_STATUS_LABELS } from "@/lib/constants";
import { monthKey, todayJst } from "@/lib/date";
import { formatDate, formatMinutes } from "@/lib/format";
import { enumParam, textParam } from "@/lib/search-params";
import { withUser } from "@/server/auth/session";
import { listEmployees } from "@/server/queries/employees";
import { EMPLOYMENT_STATUSES } from "@/types/domain";

export const metadata: Metadata = { title: "従業員管理" };

export default async function EmployeesPage(props: PageProps<"/employees">) {
  const sp = await props.searchParams;
  const q = textParam(sp, "q");
  const status = enumParam(sp, "status", EMPLOYMENT_STATUSES);
  const month = monthKey(todayJst());

  const { user, employees } = await withUser(
    async (db, user) => ({ user, employees: await listEmployees(db, { month, q, status }) }),
    { roles: ["admin", "manager"] },
  );
  const isAdmin = user.role === "admin";

  return (
    <>
      <PageHeader
        title={isAdmin ? "従業員管理" : "作業員"}
        description={isAdmin ? "従業員の基本情報・権限・時間原価を管理します。" : "社内の従業員の連絡先を確認できます。"}
        actions={
          isAdmin ? (
            <Button asChild size="lg">
              <Link href="/employees/new">
                <PlusIcon aria-hidden />
                従業員を登録
              </Link>
            </Button>
          ) : null
        }
      />
      <FilterBar action="/employees" q={q} placeholder="氏名・ふりがな・メール・従業員IDで検索" activeCount={status ? 1 : 0}>
        <FilterField label="在籍状況" htmlFor="f-status">
          <NativeSelect id="f-status" name="status" defaultValue={status ?? ""}>
            <option value="">すべて</option>
            {EMPLOYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EMPLOYMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
      </FilterBar>

      <p className="mt-5 mb-3 text-sm text-muted-foreground">
        <span className="num text-base font-semibold text-foreground">{employees.length}</span> 名
      </p>

      {employees.length === 0 ? (
        <EmptyState icon={UsersIcon} title="該当する従業員がいません" />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl bg-card ring-1 ring-foreground/8 md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">氏名</TableHead>
                  <TableHead>所属 / 役職</TableHead>
                  <TableHead>権限</TableHead>
                  <TableHead>連絡先</TableHead>
                  {isAdmin ? <TableHead className="text-right">時間原価</TableHead> : null}
                  <TableHead className="text-right">今月の労働時間</TableHead>
                  <TableHead>入社日</TableHead>
                  <TableHead className="pr-4">在籍</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => (
                  <TableRow key={e.id} className="group relative">
                    <TableCell className="pl-4">
                      <Link href={`/employees/${e.id}`} className="after:absolute after:inset-0">
                        <span className="font-medium group-hover:text-primary">{e.name}</span>
                      </Link>
                      <span className="num block text-xs text-muted-foreground">
                        {e.employeeCode}
                        {e.kana ? ` ・ ${e.kana}` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.departmentName ?? "—"}
                      <span className="block text-xs text-muted-foreground">{e.position}</span>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={e.role} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="block">{e.email}</span>
                      <span className="num block text-muted-foreground">{e.phone}</span>
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        <Yen value={e.hourlyCost} />
                      </TableCell>
                    ) : null}
                    <TableCell className="num text-right">{e.monthMinutes ? formatMinutes(e.monthMinutes) : "—"}</TableCell>
                    <TableCell className="num">{formatDate(e.hireDate)}</TableCell>
                    <TableCell className="pr-4">
                      <EmploymentStatusBadge status={e.employmentStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="grid gap-2 md:hidden">
            {employees.map((e) => (
              <li key={e.id}>
                <Link href={`/employees/${e.id}`} className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/8">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{e.name.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">{e.name}</span>
                      <RoleBadge role={e.role} />
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.departmentName} {e.position}
                    </span>
                  </span>
                  <EmploymentStatusBadge status={e.employmentStatus} />
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
