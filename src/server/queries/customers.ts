import "server-only";

import { sql, type Db } from "../db";

export interface CustomerListItem {
  id: string;
  customerCode: string;
  name: string;
  corporateName: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  projectCount: number;
  activeProjectCount: number;
  totalRevenue: number;
  lastProjectDate: string | null;
}

const CUSTOMER_STATS = sql`
  (select count(*)::int from public.projects p where p.customer_id = c.id and p.status <> 'lost') as project_count,
  (select count(*)::int from public.projects p where p.customer_id = c.id and p.status in ('ordered', 'preparing', 'in_progress')) as active_project_count,
  (select coalesce(sum(p.contract_amount), 0) from public.projects p
    where p.customer_id = c.id and p.status in ('completed', 'invoiced', 'paid')) as total_revenue,
  (select max(coalesce(p.actual_end_date, p.planned_end_date)) from public.projects p
    where p.customer_id = c.id and p.status <> 'lost') as last_project_date
`;

export async function listCustomers(db: Db, options: { q?: string; sort?: "code" | "revenue" } = {}): Promise<CustomerListItem[]> {
  const conditions = [];
  if (options.q) {
    const like = sql.likeEscape(options.q);
    conditions.push(
      sql`(c.name ilike ${like} or c.corporate_name ilike ${like} or c.contact_person ilike ${like} or c.address ilike ${like})`,
    );
  }
  return db.many<CustomerListItem>(sql`
    select c.id, c.customer_code, c.name, c.corporate_name, c.contact_person, c.phone, c.email, c.address,
           ${CUSTOMER_STATS}
    from public.customers c
    ${sql.where(conditions)}
    order by ${options.sort === "revenue" ? sql`total_revenue desc,` : sql.empty} c.customer_code
  `);
}

export interface CustomerDetail extends CustomerListItem {
  postalCode: string | null;
  memo: string | null;
  createdAt: string;
}

export async function getCustomer(db: Db, id: string): Promise<CustomerDetail | null> {
  return db.maybeOne<CustomerDetail>(sql`
    select c.id, c.customer_code, c.name, c.corporate_name, c.contact_person, c.phone, c.email, c.postal_code,
           c.address, c.memo, c.created_at,
           ${CUSTOMER_STATS}
    from public.customers c
    where c.id = ${id}
  `);
}
