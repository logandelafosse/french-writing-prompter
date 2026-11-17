import { createClient } from "@libsql/client";
import { appTimeZone, localDateKey } from "../../src/lib/dates";
import { assertE2eDatabaseUrl } from "../../src/server/e2e-database";

/** Newest genre Mistake is actif; accents only outside the 5-session window is tranquille. */
export async function seedResourceWeaknesses(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./.e2e/e2e.db";
  assertE2eDatabaseUrl(databaseUrl);
  const client = createClient({ url: databaseUrl });
  const tz = process.env.APP_TIME_ZONE ?? appTimeZone();
  const now = Date.now();
  try {
    await client.execute({
      sql: `INSERT INTO level_changes (from_level, to_level, source, created_at)
       VALUES (NULL, 'B1', 'manual', ?)`,
      args: [new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString()],
    });
    for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
      const evaluatedAt = new Date(
        now - daysAgo * 24 * 60 * 60 * 1000,
      ).toISOString();
      const localDate = localDateKey(
        new Date(now - daysAgo * 24 * 60 * 60 * 1000),
        tz,
      );
      const inserted = await client.execute({
        sql: `INSERT INTO sessions (
          prompt_text, prompt_constraints, writing_text, evaluation_json,
          cefr_level, created_at, kind, local_date, status, evaluated_at, prompt_level
        ) VALUES (?, '{}', 'Texte.', '{}', 'B1', ?, 'daily', ?, 'evaluated', ?, 'B1')`,
        args: ["Consigne passée", evaluatedAt, localDate, evaluatedAt],
      });
      const sessionId = Number(inserted.lastInsertRowid);
      const category =
        daysAgo === 6 ? "accents" : daysAgo === 0 ? "genre" : null;
      if (category === null) continue;
      await client.execute({
        sql: `INSERT INTO corrections (
          id, session_id, ordinal, kind, category, quote, span_start, span_end,
          anchor, suggestion, explanation, resource_ids_json, status, created_at
        ) VALUES (?, ?, 1, 'mistake', ?, 'les enfant', 0, 11, 'exact', 'les enfants',
          'Accord.', '[]', 'open', ?)`,
        args: [`${sessionId}-${category}`, sessionId, category, evaluatedAt],
      });
    }
  } finally {
    client.close();
  }
}
