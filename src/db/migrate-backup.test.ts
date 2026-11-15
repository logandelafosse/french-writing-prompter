import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, afterEach } from "vitest";
import { createLibsqlClient } from "@/db/libsql-client";
import { migrateWithBackup } from "@/db/migrate-run";

function listBackups(dbPath: string): string[] {
  const dir = path.dirname(dbPath);
  const base = path.basename(dbPath);
  return fs.readdirSync(dir).filter((name) => name.startsWith(`${base}.bak-`));
}

describe("migrateWithBackup", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates exactly one backup when migrations are pending on an existing file", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fwp-migrate-bak-"));
    const dbPath = path.join(tempDir, "app.db");
    const databaseUrl = `file:${dbPath}`;

    const seed = createLibsqlClient(databaseUrl);
    await seed.execute(
      "CREATE TABLE sessions (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, prompt_text text NOT NULL)",
    );
    seed.close();

    const first = await migrateWithBackup(databaseUrl);
    expect(first.migrated).toBe(true);
    expect(first.backedUp).toBe(true);
    expect(listBackups(dbPath)).toHaveLength(1);

    const second = await migrateWithBackup(databaseUrl);
    expect(second.migrated).toBe(false);
    expect(second.backedUp).toBe(false);
    expect(listBackups(dbPath)).toHaveLength(1);
  });

  it("creates no backup when the database file does not exist yet", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fwp-migrate-new-"));
    const dbPath = path.join(tempDir, "fresh.db");
    const databaseUrl = `file:${dbPath}`;

    const result = await migrateWithBackup(databaseUrl);
    expect(result.migrated).toBe(true);
    expect(result.backedUp).toBe(false);
    expect(listBackups(dbPath)).toHaveLength(0);
    expect(fs.existsSync(dbPath)).toBe(true);

    createLibsqlClient(databaseUrl).close();
  });
});
