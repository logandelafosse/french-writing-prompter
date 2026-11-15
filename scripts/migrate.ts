import { createClient } from "@libsql/client";
import { migrateWithBackup } from "../src/db/migrate-run";
import { backfillSessionsLocalDate } from "../src/db/backfills/sessions-local-date";

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./data.db";
  await migrateWithBackup(databaseUrl);
  const client = createClient({ url: databaseUrl });
  try {
    await backfillSessionsLocalDate(client);
  } finally {
    client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
