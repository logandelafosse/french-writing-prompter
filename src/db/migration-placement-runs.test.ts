import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLibsqlClient } from "@/db/libsql-client";
import { migrateWithBackup } from "@/db/migrate-run";

describe("placement_runs migration", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates placement_runs and session placement columns", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fwp-placement-mig-"));
    const databaseUrl = `file:${path.join(tempDir, "app.db")}`;
    expect((await migrateWithBackup(databaseUrl)).migrated).toBe(true);
    const client = createLibsqlClient(databaseUrl);
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'placement_runs'",
    );
    expect(tables.rows).toHaveLength(1);
    const sessionColumns = await client.execute("PRAGMA table_info(sessions)");
    const names = sessionColumns.rows.map((row) => row.name);
    expect(names).toContain("placement_run_id");
    expect(names).toContain("placement_step");
    const indexes = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'index'",
    );
    const indexNames = indexes.rows.map((row) => row.name);
    expect(indexNames).toContain("placement_runs_in_progress_idx");
    expect(indexNames).toContain("sessions_placement_step_idx");
    client.close();
  });
});
