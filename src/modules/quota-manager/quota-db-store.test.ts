import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { saveSession } from "@/modules/history-store/history-store";
import {
  QuotaExhaustedError,
  assertQuotaAvailable,
  countDailySessions,
  getQuotaState,
} from "./quota-db-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";

describe("quota-db-store local date", () => {
  beforeEach(async () => {
    await db.delete(sessions).execute();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts two daily sessions on the same Chicago evening day", async () => {
    vi.setSystemTime(new Date("2026-11-14T21:30:00-06:00"));

    await saveSession({
      promptText: "a",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
    });
    await saveSession({
      promptText: "b",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
    });

    expect(await countDailySessions()).toBe(2);
    const quota = await getQuotaState();
    expect(quota.remaining).toBe(1);
    expect(quota.resetsAt).toMatch(/T/);
  });

  it("never counts more than three daily sessions on the same local date", async () => {
    vi.setSystemTime(new Date("2026-11-14T12:00:00-06:00"));
    for (let i = 0; i < 3; i++) {
      await saveSession({
        promptText: `slot-${i}`,
        promptConstraints: JSON.stringify({
          cefrLevel: "A2",
          dialect: DEFAULT_DIALECT,
        }),
        writingText: null,
        evaluationJson: null,
        cefrLevel: "A2",
        localDate: "2026-11-14",
      });
    }
    await expect(assertQuotaAvailable()).rejects.toThrow(QuotaExhaustedError);
    expect(await countDailySessions()).toBe(3);
  });

  it("keys quota to the next local day after midnight", async () => {
    vi.setSystemTime(new Date("2026-11-15T00:30:00-06:00"));

    await saveSession({
      promptText: "c",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
    });

    expect(await countDailySessions()).toBe(1);
    const rows = await db.select().from(sessions);
    expect(rows[0]?.localDate).toBe("2026-11-15");
  });
});
