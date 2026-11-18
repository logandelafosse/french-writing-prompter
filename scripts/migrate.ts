import { backfillSessionsV2 } from "../src/db/backfill-sessions-v2";
import { createLibsqlClient } from "../src/db/libsql-client";
import {
  backfillSessionsLocalDate,
  migrateWithBackup,
} from "../src/db/migrate-run";

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./data.db";
  await migrateWithBackup(databaseUrl);
  const client = createLibsqlClient(databaseUrl);
  try {
    await backfillSessionsLocalDate(client);
    await backfillSessionsV2(client);
  } finally {
    client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
