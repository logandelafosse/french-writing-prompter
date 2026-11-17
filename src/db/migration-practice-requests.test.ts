import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLibsqlClient } from "@/db/libsql-client";
import { migrateWithBackup } from "@/db/migrate-run";

describe("practice_requests migration", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates practice_requests", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fwp-practice-mig-"));
    const databaseUrl = `file:${path.join(tempDir, "app.db")}`;
    expect((await migrateWithBackup(databaseUrl)).migrated).toBe(true);
    const client = createLibsqlClient(databaseUrl);
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'practice_requests'",
    );
    expect(tables.rows).toHaveLength(1);
    client.close();
  });
});
