import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, afterEach } from "vitest";
import { createLibsqlClient } from "@/db/libsql-client";
import { migrateWithBackup } from "@/db/migrate-run";

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
`;

describe("baseline migration on push-created database", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps session 35 data and records the baseline migration", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fwp-baseline-"));
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
        "2026-01-01T00:00:00.000Z",
      ],
    });
    await client.close();

    await migrateWithBackup(databaseUrl);

    const migrated = createLibsqlClient(databaseUrl);
    const row = await migrated.execute(
      "SELECT evaluation_json FROM sessions WHERE id = 35",
    );
    expect(row.rows[0]?.evaluation_json).toBe('{"score": 5}');

    const journal = await migrated.execute(
      "SELECT hash FROM __drizzle_migrations",
    );
    expect(journal.rows.length).toBeGreaterThan(0);
    await migrated.close();
  });
});
