import { Building2Icon, MailIcon, MapPinIcon, PencilIcon, PhoneIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ConfirmActionButton } from "@/components/common/confirm-action-button";
import { EmptyState } from "@/components/common/empty-state";
import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { ProjectList } from "@/components/projects/project-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { todayJst } from "@/lib/date";
import { formatDate, formatPercent, formatYen } from "@/lib/format";
import { calcProfitRate } from "@/lib/money";
import { isUuid } from "@/lib/search-params";
import { deleteCustomerAction } from "@/server/actions/customers";
import { withUser } from "@/server/auth/session";
import { getCustomer } from "@/server/queries/customers";
import { listProjects } from "@/server/queries/projects";

export const metadata: Metadata = { title: "顧客詳細" };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export default async function CustomerDetailPage(props: PageProps<"/customers/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const data = await withUser(
    async (db, user) => {
      const customer = await getCustomer(db, id);
      if (!customer) return null;
      return { customer, projects: await listProjects(db, user, { customerId: id, sort: "start" }) };
    },
    { roles: ["admin"] },
  );
  if (!data) notFound();
  const { customer, projects } = data;
  const revenueProjects = projects.filter((p) => ["completed", "invoiced", "paid"].includes(p.status));
  const revenue = revenueProjects.reduce((s, p) => s + (p.contractAmount ?? 0), 0);
  const cost = revenueProjects.reduce((s, p) => s + (p.totalCost ?? 0), 0);

  return (
    <>
      <PageHeader
        backHref="/customers"
        backLabel="顧客一覧"
        title={customer.name}
        description={customer.corporateName ?? "個人のお客様"}
        actions={
          <>
            <Button asChild variant="outline" size="lg">
              <Link href={`/customers/${id}/edit`}>
                <PencilIcon aria-hidden />
                編集
              </Link>
            </Button>
            {projects.length === 0 ? (
              <ConfirmActionButton action={deleteCustomerAction.bind(null, id)} title="この顧客を削除しますか？" description="この操作は元に戻せません。" />
            ) : null}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="累計売上" value={formatYen(customer.totalRevenue)} sub={`完工 ${revenueProjects.length}件`} />
        <KpiCard label="累計粗利益" value={formatYen(revenue - cost)} sub={`粗利率 ${formatPercent(calcProfitRate(revenue, cost))}`} />
        <KpiCard label="案件数" value={`${customer.projectCount}件`} sub={`進行中 ${customer.activeProjectCount}件`} />
        <KpiCard label="最終工事" value={formatDate(customer.lastProjectDate)} sub={`登録日 ${formatDate(customer.createdAt)}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="lg:self-start">
          <CardHeader>
            <CardTitle>顧客情報</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <Row label="顧客コード">
                <span className="num">{customer.customerCode}</span>
              </Row>
              <Row label="担当者">{customer.contactPerson ?? "—"}</Row>
              <Row label="電話番号">
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="num inline-flex items-center gap-1 text-primary hover:underline">
                    <PhoneIcon className="size-3.5" aria-hidden />
                    {customer.phone}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="メール">
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1 break-all text-primary hover:underline">
                    <MailIcon className="size-3.5 shrink-0" aria-hidden />
                    {customer.email}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="住所">
                {customer.address ? (
                  <span className="inline-flex items-start gap-1">
                    <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span>
                      {customer.postalCode ? <span className="num">〒{customer.postalCode} </span> : null}
                      {customer.address}
                    </span>
                  </span>
                ) : (
                  "—"
                )}
              </Row>
            </dl>
            {customer.memo ? <p className="mt-3 rounded-lg border border-dashed p-3 text-sm whitespace-pre-line text-muted-foreground">{customer.memo}</p> : null}
          </CardContent>
        </Card>

        <section className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">過去の案件</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects/new">
                <PlusIcon aria-hidden />
                案件を登録
              </Link>
            </Button>
          </div>
          {projects.length ? (
            <ProjectList projects={projects} showMoney today={todayJst()} />
          ) : (
            <EmptyState icon={Building2Icon} title="この顧客の案件はまだありません" compact />
          )}
        </section>
      </div>
    </>
  );
}
