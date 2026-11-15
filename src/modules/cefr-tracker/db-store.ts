import { db } from "@/db";
import { levelChanges } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { CefrLevel, LevelChange } from "./cefr-tracker";

export async function getCurrentLevel(): Promise<CefrLevel | null> {
  const rows = await db
    .select()
    .from(levelChanges)
    .orderBy(desc(levelChanges.createdAt))
    .limit(1);

  if (rows.length === 0) return null;
  return rows[0].toLevel as CefrLevel;
}

export async function setLevel(
  level: CefrLevel,
  source: "auto" | "manual"
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

  return rows.map((r) => ({
    fromLevel: r.fromLevel as CefrLevel | null,
    toLevel: r.toLevel as CefrLevel,
    source: r.source as "auto" | "manual",
    createdAt: r.createdAt,
  }));
}
