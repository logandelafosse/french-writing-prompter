import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { practiceRequests } from "@/db/schema";
import { MistakeCategory } from "@/contracts/mistake-category";

function pending() {
  return and(
    isNull(practiceRequests.cancelledAt),
    isNull(practiceRequests.consumedSessionId),
  );
}

export async function getPendingPin(): Promise<MistakeCategory | null> {
  const rows = await db
    .select({ category: practiceRequests.category })
    .from(practiceRequests)
    .where(pending())
    .orderBy(practiceRequests.id)
    .limit(1);
  if (rows[0] === undefined) return null;
  const parsed = MistakeCategory.safeParse(rows[0].category);
  return parsed.success ? parsed.data : null;
}

export async function pinPractice(
  category: MistakeCategory,
  now: () => Date,
): Promise<void> {
  const at = now().toISOString();
  await db.update(practiceRequests).set({ cancelledAt: at }).where(pending());
  await db.insert(practiceRequests).values({ category, createdAt: at });
}

export async function unpinPractice(
  category: MistakeCategory,
  now: () => Date,
): Promise<void> {
  await db
    .update(practiceRequests)
    .set({ cancelledAt: now().toISOString() })
    .where(and(eq(practiceRequests.category, category), pending()));
}

export async function consumePendingPin(sessionId: number): Promise<void> {
  await db
    .update(practiceRequests)
    .set({ consumedSessionId: sessionId })
    .where(pending());
}
