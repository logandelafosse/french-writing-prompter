import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { dailyQuota } from "@/db/schema";
import { getTodayQuota, incrementQuota } from "./quota-store";

describe("quota-store local date", () => {
  beforeEach(async () => {
    await db.delete(dailyQuota).execute();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts two increments on the same Chicago evening day", async () => {
    vi.setSystemTime(new Date("2026-11-14T21:30:00-06:00"));

    expect(await getTodayQuota()).toBe(0);
    expect(await incrementQuota()).toBe(1);
    expect(await incrementQuota()).toBe(2);
    expect(await getTodayQuota()).toBe(2);
  });
});
