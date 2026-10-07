import { PlusIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ConfirmActionButton } from "@/components/common/confirm-action-button";
import { EmptyState } from "@/components/common/empty-state";
import { Yen } from "@/components/common/money";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import type { CurrentUser } from "@/server/auth/session";
import { deleteCostEntryAction } from "@/server/actions/costs";
import type { ExpenseRow, MaterialRow, OutsourcingRow } from "@/server/queries/projects";
import type { CostType } from "@/types/domain";

function canDelete(user: CurrentUser, createdBy: string | null) {
  return user.role === "admin" || (user.role === "manager" && createdBy === user.employeeId);
}

function DeleteEntry({ type, id, label }: { type: CostType; id: string; label: string }) {
  return (
    <ConfirmActionButton
      iconOnly
      action={deleteCostEntryAction.bind(null, type, id)}
      title="この明細を削除しますか？"
      description={`「${label}」を削除します。案件の原価・利益は自動で再計算されます。`}
    />
  );
}

function Section({
  title,
  addHref,
  canAdd,
  empty,
  children,
}: {
  title: string;
  addHref: string;
  canAdd: boolean;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        {canAdd ? (
          <Button asChild size="sm" variant="outline">
            <Link href={addHref}>
              <PlusIcon aria-hidden />
              登録
            </Link>
          </Button>
        ) : null}
      </div>
      {empty ? <EmptyState compact title={`${title}はまだ登録されていません`} /> : children}
    </div>
  );
}

const tableWrap = "overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/8";

export function MaterialTable({ rows, user, projectId }: { rows: MaterialRow[]; user: CurrentUser; projectId: string }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <Section title="材料費" addHref={`/costs/new?type=material&projectId=${projectId}`} canAdd={user.role !== "staff"} empty={!rows.length}>
      <div className={tableWrap}>
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">日付</TableHead>
              <TableHead>材料名</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">単価</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead>仕入先</TableHead>
              <TableHead className="w-10 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="num pl-4 whitespace-nowrap">{formatDate(r.purchaseDate)}</TableCell>
                <TableCell>
                  {r.name}
                  {r.memo ? <span className="block text-xs text-muted-foreground">{r.memo}</span> : null}
                </TableCell>
                <TableCell className="num text-right whitespace-nowrap">
                  {formatNumber(r.quantity)}
                  {r.unit}
                </TableCell>
                <TableCell className="text-right">
                  <Yen value={r.unitPrice} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  <Yen value={r.amount} />
                </TableCell>
                <TableCell className="text-muted-foreground">{r.supplier ?? "—"}</TableCell>
                <TableCell className="pr-4">{canDelete(user, r.createdBy) ? <DeleteEntry type="material" id={r.id} label={r.name} /> : null}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="pl-4">
                合計（{rows.length}件）
              </TableCell>
              <TableCell className="text-right">
                <Yen value={total} className="font-bold" />
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Section>
  );
}

export function OutsourcingTable({ rows, user, projectId }: { rows: OutsourcingRow[]; user: CurrentUser; projectId: string }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <Section title="外注費" addHref={`/costs/new?type=outsourcing&projectId=${projectId}`} canAdd={user.role !== "staff"} empty={!rows.length}>
      <div className={tableWrap}>
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">日付</TableHead>
              <TableHead>外注先</TableHead>
              <TableHead>作業内容</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead className="w-10 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="num pl-4 whitespace-nowrap">{formatDate(r.costDate)}</TableCell>
                <TableCell className="whitespace-nowrap">{r.vendorName}</TableCell>
                <TableCell>
                  {r.description}
                  {r.memo ? <span className="block text-xs text-muted-foreground">{r.memo}</span> : null}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <Yen value={r.amount} />
                </TableCell>
                <TableCell className="pr-4">
                  {canDelete(user, r.createdBy) ? <DeleteEntry type="outsourcing" id={r.id} label={r.vendorName} /> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="pl-4">
                合計（{rows.length}件）
              </TableCell>
              <TableCell className="text-right">
                <Yen value={total} className="font-bold" />
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Section>
  );
}

export function ExpenseTable({ rows, user, projectId }: { rows: ExpenseRow[]; user: CurrentUser; projectId: string }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <Section title="その他経費" addHref={`/costs/new?type=expense&projectId=${projectId}`} canAdd={user.role !== "staff"} empty={!rows.length}>
      <div className={tableWrap}>
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">日付</TableHead>
              <TableHead>費目</TableHead>
              <TableHead>メモ</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead className="w-10 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="num pl-4 whitespace-nowrap">{formatDate(r.expenseDate)}</TableCell>
                <TableCell className="whitespace-nowrap">{EXPENSE_CATEGORY_LABELS[r.category]}</TableCell>
                <TableCell className="text-muted-foreground">{r.memo ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">
                  <Yen value={r.amount} />
                </TableCell>
                <TableCell className="pr-4">
                  {canDelete(user, r.createdBy) ? (
                    <DeleteEntry type="expense" id={r.id} label={EXPENSE_CATEGORY_LABELS[r.category]} />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="pl-4">
                合計（{rows.length}件）
              </TableCell>
              <TableCell className="text-right">
                <Yen value={total} className="font-bold" />
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Section>
  );
}
