import { db } from "@/db";
import { dailyQuota } from "@/db/schema";
import { first } from "@/lib/first";
import { todayUtcDateKey } from "@/lib/utc-date-key";
import { eq } from "drizzle-orm";

export async function getTodayQuota(): Promise<number> {
  const today = todayUtcDateKey();
  const rows = await db
    .select()
    .from(dailyQuota)
    .where(eq(dailyQuota.date, today))
    .limit(1);

  if (rows.length === 0) return 0;
  return first(rows, `daily_quota row for ${today}`).usedCount;
}

export async function incrementQuota(): Promise<number> {
  const today = todayUtcDateKey();
  const existing = await db
    .select()
    .from(dailyQuota)
    .where(eq(dailyQuota.date, today))
    .limit(1);

  if (existing.length > 0) {
    const row = first(existing, `daily_quota row for ${today}`);
    const newCount = row.usedCount + 1;
    await db
      .update(dailyQuota)
      .set({ usedCount: newCount })
      .where(eq(dailyQuota.date, today));
    return newCount;
  }

  await db.insert(dailyQuota).values({ date: today, usedCount: 1 });
  return 1;
}