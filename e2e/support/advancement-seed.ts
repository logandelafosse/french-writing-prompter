import { createClient } from "@libsql/client";
import {
  appTimeZone,
  localDateKey,
  todayLocalDateKey,
} from "../../src/lib/dates";
import { assertE2eDatabaseUrl } from "../../src/server/e2e-database";

/** Two above-level B2 evaluations at B1, plus an active daily session for the third submit. */
export async function seedAdvancementStreakTwoOfThree(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./.e2e/e2e.db";
  assertE2eDatabaseUrl(databaseUrl);
  const client = createClient({ url: databaseUrl });
  const tz = process.env.APP_TIME_ZONE ?? appTimeZone();
  const today = todayLocalDateKey(tz);
  const yesterday = localDateKey(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    tz,
  );
  const now = Date.now();
  const levelAt = new Date(now - 3 * 60 * 60 * 1000).toISOString();
  const eval1At = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const eval2At = new Date(now - 90 * 60 * 1000).toISOString();
  const activeAt = new Date(now - 30 * 60 * 1000).toISOString();
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
        ) VALUES (?, '{}', 'Texte.', '{}', 'B2', ?, 'daily', ?, 'evaluated', ?, 'B1')`,
        args: ["Consigne passée", createdAt, yesterday, evaluatedAt],
      });
    }
    await client.execute({
      sql: `INSERT INTO sessions (
        prompt_text, prompt_constraints, writing_text, evaluation_json,
        cefr_level, created_at, kind, local_date, status, prompt_level
      ) VALUES ('Consigne active', '{"cefrLevel":"B1"}', NULL, NULL, 'B1', ?, 'daily', ?, 'active', 'B1')`,
      args: [activeAt, today],
    });
  } finally {
    client.close();
  }
}
