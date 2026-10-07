import "server-only";

import { sql, type Db } from "../db";

/** 案件フォームの顧客選択肢（住所コピー用に住所も含む） */
export async function listCustomerChoices(db: Db) {
  return db.many<{ id: string; name: string; address: string | null }>(sql`
    select id, name, address from public.customers order by customer_code
  `);
}
