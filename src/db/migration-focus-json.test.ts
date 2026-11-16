import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLibsqlClient } from "@/db/libsql-client";
import { migrateWithBackup } from "@/db/migrate-run";

describe("focus_json migration", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("adds focus_json on sessions", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fwp-focus-json-mig-"));
    const dbPath = path.join(tempDir, "app.db");
    const databaseUrl = `file:${dbPath}`;

    const result = await migrateWithBackup(databaseUrl);
    expect(result.migrated).toBe(true);

    const migrated = createLibsqlClient(databaseUrl);
    const sessionColumns = await migrated.execute(
      "PRAGMA table_info(sessions)",
    );
    expect(sessionColumns.rows.map((row) => row.name)).toContain("focus_json");
    migrated.close();
  });
});
