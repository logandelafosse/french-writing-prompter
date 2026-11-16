import { eq } from "drizzle-orm";
import { db } from "@/db";
import { corrections, sessions } from "@/db/schema";
import { CorrectionKind, CorrectionStatus } from "@/contracts/correction";
import { MistakeCategory } from "@/contracts/mistake-category";
import {
  aggregateWeaknesses,
  type RankedWeakness,
  type WeaknessSession,
} from "./aggregate";

export async function listRankedWeaknesses(): Promise<RankedWeakness[]> {
  const sessionRows = await db
    .select({
      id: sessions.id,
      kind: sessions.kind,
      evaluatedAt: sessions.evaluatedAt,
    })
    .from(sessions)
    .where(eq(sessions.status, "evaluated"));
  const correctionRows = await db
    .select({
      sessionId: corrections.sessionId,
      kind: corrections.kind,
      status: corrections.status,
      category: corrections.category,
    })
    .from(corrections);

  const bySession = new Map<number, WeaknessSession["corrections"]>();
  for (const row of correctionRows) {
    const kind = CorrectionKind.safeParse(row.kind);
    const status = CorrectionStatus.safeParse(row.status);
    if (!kind.success || !status.success) continue;
    const category = MistakeCategory.safeParse(row.category);
    const list = bySession.get(row.sessionId) ?? [];
    list.push({
      kind: kind.data,
      status: status.data,
      category: category.success ? category.data : null,
    });
    bySession.set(row.sessionId, list);
  }

  const input: WeaknessSession[] = [];
  for (const row of sessionRows) {
    if (row.evaluatedAt === null) continue;
    input.push({
      evaluatedAt: row.evaluatedAt,
      kind: row.kind,
      corrections: bySession.get(row.id) ?? [],
    });
  }
  return aggregateWeaknesses(input);
}
