import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLibsqlClient } from "@/db/libsql-client";
import { migrateWithBackup } from "@/db/migrate-run";

const CORRECTION_COLUMNS = [
  "id",
  "session_id",
  "ordinal",
  "kind",
  "category",
  "quote",
  "span_start",
  "span_end",
  "anchor",
  "suggestion",
  "explanation",
  "question",
  "rule_if_dialect",
  "dlf_entry_id",
  "dlf_headword",
  "resource_ids_json",
  "status",
  "dialect_note_id",
  "created_at",
  "resolved_at",
  "context_quote",
  "dialect_example",
  "dialect_lemma",
  "dialect_pattern",
] as const;

describe("corrections migration", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("adds the corrections table and evaluation_raw on sessions", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fwp-corrections-mig-"));
    const dbPath = path.join(tempDir, "app.db");
    const databaseUrl = `file:${dbPath}`;

    const result = await migrateWithBackup(databaseUrl);
    expect(result.migrated).toBe(true);

    const migrated = createLibsqlClient(databaseUrl);
    const tables = await migrated.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'corrections'",
    );
    expect(tables.rows).toHaveLength(1);

    const columns = await migrated.execute("PRAGMA table_info(corrections)");
    expect(columns.rows.map((row) => row.name)).toEqual([
      ...CORRECTION_COLUMNS,
    ]);

    const sessionColumns = await migrated.execute(
      "PRAGMA table_info(sessions)",
    );
    expect(sessionColumns.rows.map((row) => row.name)).toContain(
      "evaluation_raw",
    );

    const indexes = await migrated.execute("PRAGMA index_list(corrections)");
    const indexNames = indexes.rows.map((row) => row.name);
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "corrections_session_idx",
        "corrections_cat_idx",
      ]),
    );
    migrated.close();
  });
});
