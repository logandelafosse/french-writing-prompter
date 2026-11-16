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

export async function getPendingPractice(): Promise<{
  id: number;
  category: MistakeCategory;
} | null> {
  const rows = await db
    .select({
      id: practiceRequests.id,
      category: practiceRequests.category,
    })
    .from(practiceRequests)
    .where(pending())
    .orderBy(practiceRequests.id)
    .limit(1);
  const row = rows[0];
  if (row === undefined) return null;
  const parsed = MistakeCategory.safeParse(row.category);
  if (!parsed.success) return null;
  return { id: row.id, category: parsed.data };
}

export async function getPendingPin(): Promise<MistakeCategory | null> {
  const pin = await getPendingPractice();
  return pin?.category ?? null;
}

let pinChain = Promise.resolve();

function withPinLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = pinChain.then(fn, fn);
  pinChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function pinPractice(
  category: MistakeCategory,
  now: () => Date,
): Promise<void> {
  const at = now().toISOString();
  await withPinLock(() =>
    db.transaction(async (tx) => {
      await tx
        .update(practiceRequests)
        .set({ cancelledAt: at })
        .where(pending());
      await tx.insert(practiceRequests).values({ category, createdAt: at });
    }),
  );
}

export async function unpinPractice(
  category: MistakeCategory,
  now: () => Date,
): Promise<void> {
  await withPinLock(async () => {
    await db
      .update(practiceRequests)
      .set({ cancelledAt: now().toISOString() })
      .where(and(eq(practiceRequests.category, category), pending()));
  });
}

export async function consumePendingPin(
  pinId: number,
  sessionId: number,
): Promise<void> {
  await db
    .update(practiceRequests)
    .set({ consumedSessionId: sessionId })
    .where(and(eq(practiceRequests.id, pinId), pending()));
}
