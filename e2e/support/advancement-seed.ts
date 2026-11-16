import { createClient } from "@libsql/client";
import { assertE2eDatabaseUrl } from "../../src/server/e2e-database";

/** Two above-level B2 evaluations at B1, plus an active daily session for the third submit. */
export async function seedAdvancementStreakTwoOfThree(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./.e2e/e2e.db";
  assertE2eDatabaseUrl(databaseUrl);
  const client = createClient({ url: databaseUrl });
  const levelAt = "2026-11-16T06:00:00.000Z";
  const eval1At = "2026-11-16T07:00:00.000Z";
  const eval2At = "2026-11-16T08:00:00.000Z";
  const activeAt = "2026-11-16T08:30:00.000Z";
  try {
    await client.execute({
      sql: `INSERT INTO level_changes (from_level, to_level, source, created_at)
       VALUES (NULL, 'B1', 'manual', ?)`,
      args: [levelAt],
    });
    for (const [evaluatedAt, createdAt] of [
      [eval1At, eval1At],
      [eval2At, eval2At],
    ] as const) {
      await client.execute({
        sql: `INSERT INTO sessions (
          prompt_text, prompt_constraints, writing_text, evaluation_json,
          cefr_level, created_at, kind, local_date, status, evaluated_at, prompt_level
        ) VALUES (?, '{}', 'Texte.', '{}', 'B2', ?, 'daily', '2026-11-15', 'evaluated', ?, 'B1')`,
        args: ["Consigne passée", createdAt, evaluatedAt],
      });
    }
    await client.execute({
      sql: `INSERT INTO sessions (
        prompt_text, prompt_constraints, writing_text, evaluation_json,
        cefr_level, created_at, kind, local_date, status, prompt_level
      ) VALUES ('Consigne active', '{"cefrLevel":"B1"}', NULL, NULL, 'B1', ?, 'daily', '2026-11-16', 'active', 'B1')`,
      args: [activeAt],
    });
  } finally {
    client.close();
  }
}
