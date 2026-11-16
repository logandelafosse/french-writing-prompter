import { createClient } from "@libsql/client";
import { appTimeZone, localDateKey } from "../../src/lib/dates";
import { assertE2eDatabaseUrl } from "../../src/server/e2e-database";

/** Two prior evaluated sessions with actif infinitif_participe and imparfait_pc. */
export async function seedFocusWeaknesses(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./.e2e/e2e.db";
  assertE2eDatabaseUrl(databaseUrl);
  const client = createClient({ url: databaseUrl });
  const tz = process.env.APP_TIME_ZONE ?? appTimeZone();
  const yesterday = localDateKey(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    tz,
  );
  const older = localDateKey(new Date(Date.now() - 48 * 60 * 60 * 1000), tz);
  const now = Date.now();
  const levelAt = new Date(now - 3 * 60 * 60 * 1000).toISOString();
  try {
    await client.execute({
      sql: `INSERT INTO level_changes (from_level, to_level, source, created_at)
       VALUES (NULL, 'B1', 'manual', ?)`,
      args: [levelAt],
    });
    for (const [localDate, evaluatedAt] of [
      [older, new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()],
      [yesterday, new Date(now - 20 * 60 * 60 * 1000).toISOString()],
    ] as const) {
      const inserted = await client.execute({
        sql: `INSERT INTO sessions (
          prompt_text, prompt_constraints, writing_text, evaluation_json,
          cefr_level, created_at, kind, local_date, status, evaluated_at, prompt_level
        ) VALUES (?, '{}', 'Texte.', '{}', 'B1', ?, 'daily', ?, 'evaluated', ?, 'B1')`,
        args: ["Consigne passée", evaluatedAt, localDate, evaluatedAt],
      });
      const sessionId = Number(inserted.lastInsertRowid);
      let ordinal = 1;
      for (const category of ["infinitif_participe", "imparfait_pc"]) {
        await client.execute({
          sql: `INSERT INTO corrections (
            id, session_id, ordinal, kind, category, quote, span_start, span_end,
            anchor, suggestion, explanation, resource_ids_json, status, created_at
          ) VALUES (?, ?, ?, 'mistake', ?, 'les enfant', 0, 11, 'exact', 'les enfants',
            'Accord.', '[]', 'open', ?)`,
          args: [
            `${sessionId}-${category}`,
            sessionId,
            ordinal,
            category,
            evaluatedAt,
          ],
        });
        ordinal += 1;
      }
    }
  } finally {
    client.close();
  }
}
