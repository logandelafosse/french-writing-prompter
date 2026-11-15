import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { applyMigrations, migrationsFolderPath } from "@/db/migrate-run";
import { createLibsqlClient } from "@/db/libsql-client";

export async function createTestDb() {
  const client = createLibsqlClient(":memory:");
  const db = drizzle(client, { schema });
  await applyMigrations(db);

  return {
    db,
    client,
    migrationsFolder: migrationsFolderPath(),
  };
}
