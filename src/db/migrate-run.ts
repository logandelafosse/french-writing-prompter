import fs from "node:fs";
import path from "node:path";
import type { Client } from "@libsql/client";
import { databaseUrlToFilePath } from "./database-url";
import { createLibsqlClient } from "./libsql-client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import * as schema from "./schema";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export function migrationsFolderPath(): string {
  return MIGRATIONS_FOLDER;
}

export function latestMigrationMillis(): number {
  const migrations = readMigrationFiles({
    migrationsFolder: MIGRATIONS_FOLDER,
  });
  if (migrations.length === 0) {
    return 0;
  }
  return Math.max(...migrations.map((m) => m.folderMillis));
}

export async function getLastAppliedMigrationMillis(
  client: Client,
): Promise<number | null> {
  try {
    const result = await client.execute(
      "SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1",
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return Number(row.created_at);
  } catch {
    return null;
  }
}

export function hasPendingMigrations(
  lastAppliedMillis: number | null,
): boolean {
  const latest = latestMigrationMillis();
  if (latest === 0) {
    return false;
  }
  return lastAppliedMillis === null || lastAppliedMillis < latest;
}

export { databaseUrlToFilePath } from "./database-url";

export async function applyMigrations(
  db: LibSQLDatabase<typeof schema>,
): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

export async function createDatabase(
  databaseUrl: string,
): Promise<{ client: Client; db: LibSQLDatabase<typeof schema> }> {
  const client = createLibsqlClient(databaseUrl);
  const db = drizzle(client, { schema });
  return { client, db };
}

export type MigrateWithBackupResult = {
  backedUp: boolean;
  backupPath: string | null;
  migrated: boolean;
};

export async function migrateWithBackup(
  databaseUrl: string,
): Promise<MigrateWithBackupResult> {
  const filePath = databaseUrlToFilePath(databaseUrl);
  const fileExists = filePath !== null && fs.existsSync(filePath);

  const { client, db } = await createDatabase(databaseUrl);
  const lastApplied = await getLastAppliedMigrationMillis(client);
  const pending = hasPendingMigrations(lastApplied);

  if (!pending) {
    await client.close();
    return { backedUp: false, backupPath: null, migrated: false };
  }

  let backupPath: string | null = null;
  if (fileExists && filePath) {
    backupPath = `${filePath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    fs.copyFileSync(filePath, backupPath);
  }

  await applyMigrations(db);
  await client.close();

  return { backedUp: backupPath !== null, backupPath, migrated: true };
}
