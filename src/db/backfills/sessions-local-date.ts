import type { Client } from "@libsql/client";
import { localDateKey } from "@/lib/dates";
import { quotaTimeZone } from "@/modules/quota-manager/quota-db-store";

export async function backfillSessionsLocalDate(client: Client): Promise<void> {
  const result = await client.execute(
    "SELECT id, created_at FROM sessions WHERE local_date IS NULL",
  );

  const tz = quotaTimeZone();
  for (const row of result.rows) {
    const id = Number(row.id);
    const createdAt = row.created_at;
    if (typeof createdAt !== "string") {
      continue;
    }
    const localDate = localDateKey(new Date(createdAt), tz);
    await client.execute({
      sql: `UPDATE sessions SET kind = COALESCE(kind, 'daily'), local_date = ? WHERE id = ?`,
      args: [localDate, id],
    });
  }
}
