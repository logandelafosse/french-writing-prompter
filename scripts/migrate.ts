import path from "node:path";
import { fileURLToPath } from "node:url";
import { backfillSessionsV2 } from "../src/db/backfill-sessions-v2";
import { createLibsqlClient } from "../src/db/libsql-client";
import {
  backfillSessionsLocalDate,
  migrateWithBackup,
} from "../src/db/migrate-run";

export async function migrateDatabase(databaseUrl: string): Promise<void> {
  await migrateWithBackup(databaseUrl);
  const client = createLibsqlClient(databaseUrl);
  try {
    await backfillSessionsLocalDate(client);
    await backfillSessionsV2(client);
  } finally {
    client.close();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./data.db";
  await migrateDatabase(databaseUrl);
}

const invokedFromCli =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedFromCli) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
