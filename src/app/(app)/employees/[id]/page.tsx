import { CalendarDaysIcon, MailIcon, PencilIcon, PhoneIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AttendanceTotalsCards } from "@/components/attendance/attendance-records";
import { EmploymentStatusBadge, ProjectStatusBadge, RoleBadge } from "@/components/common/badges";
import { Yen } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { monthKey, todayJst } from "@/lib/date";
import { formatDate, formatMonth } from "@/lib/format";
import { isUuid } from "@/lib/search-params";
import { withUser } from "@/server/auth/session";
import { listEmployeeAttendance, summarize } from "@/server/queries/attendance";
import { getEmployee, listEmployeeProjects } from "@/server/queries/employees";

export const metadata: Metadata = { title: "従業員詳細" };

const ROLE_IN_PROJECT = { site_manager: "現場責任者", sales_rep: "担当者", member: "作業員" } as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export default async function EmployeeDetailPage(props: PageProps<"/employees/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const month = monthKey(todayJst());

  const data = await withUser(
    async (db, user) => {
      const employee = await getEmployee(db, id);
      if (!employee) return null;
      return {
        user,
        employee,
        projects: await listEmployeeProjects(db, id),
        records: user.role === "admin" ? await listEmployeeAttendance(db, id, month) : [],
      };
    },
    { roles: ["admin", "manager"] },
  );
  if (!data) notFound();
  const { user, employee, projects, records } = data;
  const isAdmin = user.role === "admin";

  return (
    <>
      <PageHeader
        backHref="/employees"
        backLabel={isAdmin ? "従業員一覧" : "作業員"}
        title={employee.name}
        description={[employee.departmentName, employee.position].filter(Boolean).join(" ・ ")}
        actions={
          isAdmin ? (
            <>
              <Button asChild variant="outline" size="lg">
                <Link href={`/attendance/monthly/${employee.id}`}>
                  <CalendarDaysIcon aria-hidden />
                  勤怠を見る
                </Link>
              </Button>
              <Button asChild size="lg">
                <Link href={`/employees/${employee.id}/edit`}>
                  <PencilIcon aria-hidden />
                  編集
                </Link>
              </Button>
            </>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <RoleBadge role={employee.role} />
          <EmploymentStatusBadge status={employee.employmentStatus} />
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="lg:self-start">
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <Row label="従業員ID">
                <span className="num">{employee.employeeCode}</span>
              </Row>
              <Row label="ふりがな">{employee.kana ?? "—"}</Row>
              <Row label="メール">
                <a href={`mailto:${employee.email}`} className="inline-flex items-center gap-1 break-all text-primary hover:underline">
                  <MailIcon className="size-3.5 shrink-0" aria-hidden />
                  {employee.email}
                </a>
              </Row>
              <Row label="電話番号">
                {employee.phone ? (
                  <a href={`tel:${employee.phone}`} className="num inline-flex items-center gap-1 text-primary hover:underline">
                    <PhoneIcon className="size-3.5" aria-hidden />
                    {employee.phone}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="入社日">
                <span className="num">{formatDate(employee.hireDate)}</span>
              </Row>
              {isAdmin ? (
                <>
                  <Row label="時間原価">
                    <Yen value={employee.hourlyCost} className="font-semibold" /> / 時間
                  </Row>
                  <Row label="ログイン">{employee.hasLogin ? "アカウントあり" : "未発行"}</Row>
                </>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          {isAdmin ? (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">{formatMonth(month)}の勤怠</h2>
              <AttendanceTotalsCards totals={summarize(records, todayJst())} />
            </section>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>担当案件</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length ? (
                <ul className="divide-y">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {ROLE_IN_PROJECT[p.roleInProject]} ・ 完工予定 <span className="num">{formatDate(p.plannedEndDate)}</span>
                          </span>
                        </span>
                        <ProjectStatusBadge status={p.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">担当している案件はありません。</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
