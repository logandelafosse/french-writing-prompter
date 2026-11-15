import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { applyMigrations, migrationsFolderPath } from "@/db/migrate-run";

export async function createTestDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await applyMigrations(db);

  return {
    db,
    client,
    migrationsFolder: migrationsFolderPath(),
  };
}