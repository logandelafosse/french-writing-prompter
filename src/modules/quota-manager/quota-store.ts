import { db } from "@/db";
import { sessions } from "@/db/schema";
import { DAILY_PROMPT_QUOTA } from "@/config/limits";
import {
  appTimeZone,
  nextLocalMidnightIso,
  todayLocalDateKey,
} from "@/lib/dates";
import { getEnv } from "@/server/env";
import { first } from "@/lib/first";
import { and, eq, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/db/schema";

export type QuotaState = {
  used: number;
  remaining: number;
  max: number;
  resetsAt: string;
};

type DbLike = Pick<LibSQLDatabase<typeof schema>, "select" | "insert">;

export function quotaTimeZone(): string {
  const configured = getEnv().APP_TIME_ZONE;
  return configured ?? appTimeZone();
}

function todayKey(): string {
  return todayLocalDateKey(quotaTimeZone());
}

export async function countDailySessions(
  database: DbLike = db,
): Promise<number> {
  const today = todayKey();
  const rows = await database
    .select({ count: sql<number>`count(*)` })
    .from(sessions)
    .where(and(eq(sessions.kind, "daily"), eq(sessions.localDate, today)));
  const row = first(rows, `daily session count for ${today}`);
  return row.count;
}

export function buildQuotaState(used: number): QuotaState {
  const remaining = Math.max(0, DAILY_PROMPT_QUOTA - used);
  return {
    used,
    remaining,
    max: DAILY_PROMPT_QUOTA,
    resetsAt: nextLocalMidnightIso(new Date(), quotaTimeZone()),
  };
}

export async function getQuotaState(): Promise<QuotaState> {
  const used = await countDailySessions();
  return buildQuotaState(used);
}

export class QuotaExhaustedError extends Error {
  readonly resetsAt: string;

  constructor(resetsAt: string) {
    super("QUOTA_EXHAUSTED");
    this.name = "QuotaExhaustedError";
    this.resetsAt = resetsAt;
  }
}

export async function assertQuotaAvailable(
  database: DbLike = db,
): Promise<void> {
  const used = await countDailySessions(database);
  if (used >= DAILY_PROMPT_QUOTA) {
    throw new QuotaExhaustedError(
      nextLocalMidnightIso(new Date(), quotaTimeZone()),
    );
  }
}
