import { db } from "@/db";
import { levelChanges } from "@/db/schema";
import { LevelSource, parseCefrLevel } from "@/contracts/cefr";
import { first } from "@/lib/first";
import { desc } from "drizzle-orm";
import type { CefrLevel } from "@/contracts/cefr";
import type { LevelChange } from "./cefr-tracker";

export async function getCurrentLevel(): Promise<CefrLevel | null> {
  const rows = await db
    .select()
    .from(levelChanges)
    .orderBy(desc(levelChanges.createdAt))
    .limit(1);

  if (rows.length === 0) return null;
  const row = first(rows, "latest level_changes row");
  return parseCefrLevel(row.toLevel);
}

export async function setLevel(
  level: CefrLevel,
  source: "auto" | "manual",
): Promise<LevelChange> {
  const fromLevel = await getCurrentLevel();

  await db.insert(levelChanges).values({
    fromLevel: fromLevel,
    toLevel: level,
    source,
    createdAt: new Date().toISOString(),
  });

  return {
    fromLevel,
    toLevel: level,
    source,
    createdAt: new Date().toISOString(),
  };
}

export async function getLevelHistory(): Promise<LevelChange[]> {
  const rows = await db
    .select()
    .from(levelChanges)
    .orderBy(desc(levelChanges.createdAt));

  const history: LevelChange[] = [];
  for (const r of rows) {
    const toLevel = parseCefrLevel(r.toLevel);
    if (toLevel === null) continue;
    const fromLevel = parseCefrLevel(r.fromLevel);
    const sourceParsed = LevelSource.safeParse(r.source);
    if (!sourceParsed.success) continue;

    history.push({
      fromLevel,
      toLevel,
      source: sourceParsed.data,
      createdAt: r.createdAt,
    });
  }
  return history;
}
