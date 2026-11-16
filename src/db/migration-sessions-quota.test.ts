import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLibsqlClient } from "@/db/libsql-client";
import { migrateWithBackup } from "@/db/migrate-run";
import { backfillSessionsLocalDate } from "@/db/migrate-run";

const PUSH_CREATED_DDL = `
CREATE TABLE sessions (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  prompt_text text NOT NULL,
  prompt_constraints text NOT NULL,
  writing_text text,
  evaluation_json text,
  cefr_level text,
  created_at text NOT NULL
);
CREATE TABLE daily_quota (
  date text PRIMARY KEY NOT NULL,
  used_count integer DEFAULT 0 NOT NULL
);
`;

describe("sessions quota migration", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("adds quota columns, drops daily_quota, and backfills local_date", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fwp-quota-mig-"));
    const dbPath = path.join(tempDir, "legacy.db");
    const databaseUrl = `file:${dbPath}`;

    const client = createLibsqlClient(databaseUrl);
    await client.execute(PUSH_CREATED_DDL);
    await client.execute({
      sql: `INSERT INTO sessions (
        id, prompt_text, prompt_constraints, writing_text,
        evaluation_json, cefr_level, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        35,
        "legacy",
        "{}",
        null,
        '{"score": 5}',
        "A2",
        "2026-01-01T12:00:00.000Z",
      ],
    });
    client.close();

    await migrateWithBackup(databaseUrl);
    const migrated = createLibsqlClient(databaseUrl);
    await backfillSessionsLocalDate(migrated);

    const row = await migrated.execute(
      "SELECT evaluation_json, kind, local_date FROM sessions WHERE id = 35",
    );
    expect(row.rows[0]?.evaluation_json).toBe('{"score": 5}');
    expect(row.rows[0]?.kind).toBe("daily");
    expect(row.rows[0]?.local_date).toBeTruthy();

    await expect(
      migrated.execute("SELECT date FROM daily_quota"),
    ).rejects.toThrow();
    migrated.close();
  });
});
