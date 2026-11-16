import type { Client } from "@libsql/client";
import { parseCefrLevel } from "@/contracts/cefr";
import { PromptConstraints } from "@/contracts/prompt";
import { localDateKey } from "@/lib/dates";
import { parseJson } from "@/lib/json";
import { quotaTimeZone } from "@/modules/quota-manager/quota-store";

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function backfillSessionsV2(client: Client): Promise<void> {
  const result = await client.execute(
    `SELECT id, created_at, local_date, prompt_constraints, cefr_level,
            evaluation_json, prompt_level
     FROM sessions WHERE status IS NULL OR local_date IS NULL`,
  );
  const timeZone = quotaTimeZone();
  const today = localDateKey(new Date(), timeZone);
  const rows = [];
  for (const raw of result.rows) {
    const createdAt = raw.created_at;
    const promptConstraints = raw.prompt_constraints;
    const id = Number(raw.id);
    if (
      typeof createdAt !== "string" ||
      typeof promptConstraints !== "string"
    ) {
      continue;
    }
    if (!Number.isInteger(id)) continue;
    rows.push({
      id,
      createdAt,
      localDate: textOrNull(raw.local_date),
      promptConstraints,
      cefrLevel: textOrNull(raw.cefr_level),
      evaluationJson: textOrNull(raw.evaluation_json),
      promptLevel: textOrNull(raw.prompt_level),
    });
  }

  let newestTodayId: number | null = null;
  let newestCreated = "";
  for (const row of rows) {
    if (row.evaluationJson !== null) continue;
    if (localDateKey(new Date(row.createdAt), timeZone) !== today) continue;
    const newer =
      newestTodayId === null ||
      row.createdAt > newestCreated ||
      (row.createdAt === newestCreated && row.id > newestTodayId);
    if (!newer) continue;
    newestTodayId = row.id;
    newestCreated = row.createdAt;
  }

  for (const row of rows) {
    const parsed = parseJson(PromptConstraints, row.promptConstraints);
    const promptLevel =
      row.promptLevel ??
      (parsed.ok ? parsed.value.cefrLevel : parseCefrLevel(row.cefrLevel));
    const status =
      row.id === newestTodayId
        ? "active"
        : row.evaluationJson !== null
          ? "evaluated"
          : "abandoned";
    await client.execute({
      sql: `UPDATE sessions SET status = ?, local_date = ?,
              kind = COALESCE(kind, 'daily'),
              prompt_level = COALESCE(prompt_level, ?),
              evaluated_at = COALESCE(evaluated_at, ?),
              abandoned_at = COALESCE(abandoned_at, ?)
            WHERE id = ?`,
      args: [
        status,
        row.localDate ?? localDateKey(new Date(row.createdAt), timeZone),
        promptLevel,
        status === "evaluated" ? row.createdAt : null,
        status === "abandoned" ? row.createdAt : null,
        row.id,
      ],
    });
  }
}
