import { createClient } from "@libsql/client";
import {
  backfillSessionsLocalDate,
  migrateWithBackup,
} from "../src/db/migrate-run";

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
