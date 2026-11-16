import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLibsqlClient } from "@/db/libsql-client";
import { migrateWithBackup } from "@/db/migrate-run";

const NOTE_COLUMNS = [
  "id",
  "rule",
  "example",
  "scope",
  "form",
  "learner_form",
  "tutor_suggestion",
  "source_session_id",
  "source_correction_id",
  "created_at",
  "updated_at",
  "deleted_at",
] as const;

describe("dialect notes migration", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("adds dialect_notes and dialect fields on corrections", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fwp-dialect-notes-mig-"));
    const dbPath = path.join(tempDir, "app.db");
    const databaseUrl = `file:${dbPath}`;

    const result = await migrateWithBackup(databaseUrl);
    expect(result.migrated).toBe(true);

    const migrated = createLibsqlClient(databaseUrl);
    const tables = await migrated.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'dialect_notes'",
    );
    expect(tables.rows).toHaveLength(1);

    const noteColumns = await migrated.execute(
      "PRAGMA table_info(dialect_notes)",
    );
    expect(noteColumns.rows.map((row) => row.name)).toEqual([...NOTE_COLUMNS]);

    const correctionColumns = await migrated.execute(
      "PRAGMA table_info(corrections)",
    );
    const names = correctionColumns.rows.map((row) => row.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "context_quote",
        "dialect_example",
        "dialect_lemma",
        "dialect_pattern",
      ]),
    );
    migrated.close();
  });
});
