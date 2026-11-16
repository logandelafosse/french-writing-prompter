import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLibsqlClient } from "@/db/libsql-client";
import { migrateWithBackup } from "@/db/migrate-run";
import { backfillSessionsV2 } from "@/db/backfill-sessions-v2";

const LEGACY_DDL = `
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
CREATE TABLE level_changes (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  from_level text,
  to_level text NOT NULL,
  source text NOT NULL,
  created_at text NOT NULL
);
`;

describe("sessions v2 backfill", () => {
  let tempDir = "";

  afterEach(() => {
    vi.useRealTimers();
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("assigns statuses without touching evaluation_json", async () => {
    vi.setSystemTime(new Date("2026-11-16T18:00:00.000Z"));
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fwp-sessions-v2-"));
    const dbPath = path.join(tempDir, "legacy.db");
    const databaseUrl = `file:${dbPath}`;

    const client = createLibsqlClient(databaseUrl);
    await client.execute(LEGACY_DDL);
    const rows: Array<[number, string, string | null, string | null, string]> =
      [
        [
          1,
          '{"cefrLevel":"A2","dialect":"louisiana"}',
          null,
          '{"score": 5}',
          "2026-11-15T18:00:00.000Z",
        ],
        [2, "{}", null, null, "2026-11-15T19:00:00.000Z"],
        [
          3,
          '{"cefrLevel":"B1","dialect":"louisiana"}',
          "ancien",
          null,
          "2026-11-16T15:00:00.000Z",
        ],
        [
          4,
          '{"cefrLevel":"B1","dialect":"louisiana"}',
          "encore là",
          null,
          "2026-11-16T17:30:00.000Z",
        ],
      ];
    for (const [
      id,
      promptConstraints,
      writing,
      evaluation,
      createdAt,
    ] of rows) {
      await client.execute({
        sql: `INSERT INTO sessions (
          id, prompt_text, prompt_constraints, writing_text,
          evaluation_json, cefr_level, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          "legacy",
          promptConstraints,
          writing,
          evaluation,
          id === 2 ? "B1" : "A2",
          createdAt,
        ],
      });
    }
    client.close();

    await migrateWithBackup(databaseUrl);
    const migrated = createLibsqlClient(databaseUrl);
    await backfillSessionsV2(migrated);
    await backfillSessionsV2(migrated);

    const stored = await migrated.execute(
      `SELECT id, status, evaluation_json, evaluated_at, abandoned_at, prompt_level
       FROM sessions ORDER BY id`,
    );
    const byId = new Map(stored.rows.map((row) => [Number(row.id), row]));

    expect(byId.get(1)?.status).toBe("evaluated");
    expect(byId.get(1)?.evaluation_json).toBe('{"score": 5}');
    expect(byId.get(1)?.evaluated_at).toBe("2026-11-15T18:00:00.000Z");
    expect(byId.get(1)?.prompt_level).toBe("A2");

    expect(byId.get(2)?.status).toBe("abandoned");
    expect(byId.get(2)?.abandoned_at).toBe("2026-11-15T19:00:00.000Z");
    expect(byId.get(2)?.prompt_level).toBe("B1");

    expect(byId.get(3)?.status).toBe("abandoned");
    expect(byId.get(4)?.status).toBe("active");
    expect(byId.get(4)?.evaluated_at).toBeNull();
    expect(byId.get(4)?.abandoned_at).toBeNull();

    migrated.close();
  });
});
