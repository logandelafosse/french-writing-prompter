import { db } from "@/db";
import { dailyQuota } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getTodayQuota(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const rows = await db
    .select()
    .from(dailyQuota)
    .where(eq(dailyQuota.date, today))
    .limit(1);

  return rows.length > 0 ? rows[0].usedCount : 0;
}

export async function incrementQuota(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const existing = await db
    .select()
    .from(dailyQuota)
    .where(eq(dailyQuota.date, today))
    .limit(1);

  if (existing.length > 0) {
    const newCount = existing[0].usedCount + 1;
    await db
      .update(dailyQuota)
      .set({ usedCount: newCount })
      .where(eq(dailyQuota.date, today));
    return newCount;
  }

  await db.insert(dailyQuota).values({ date: today, usedCount: 1 });
  return 1;
}
