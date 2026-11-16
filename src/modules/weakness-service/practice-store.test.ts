import { beforeEach, describe, expect, it } from "vitest";
import { and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { practiceRequests } from "@/db/schema";
import {
  consumePendingPin,
  getPendingPin,
  getPendingPractice,
  pinPractice,
} from "./practice-store";

const now = () => new Date("2026-11-14T18:00:00.000Z");

function pendingRows() {
  return db
    .select()
    .from(practiceRequests)
    .where(
      and(
        isNull(practiceRequests.cancelledAt),
        isNull(practiceRequests.consumedSessionId),
      ),
    );
}

describe("practice-store", { concurrent: false }, () => {
  beforeEach(async () => {
    await db.delete(practiceRequests).execute();
  });

  it("consumes only the snapshotted pin so a later pin stays pending", async () => {
    await pinPractice("accents", now);
    const snapshotted = await getPendingPractice();
    expect(snapshotted?.category).toBe("accents");
    const snapshottedId = snapshotted?.id;
    expect(snapshottedId).toEqual(expect.any(Number));
    if (snapshottedId === undefined) return;

    await pinPractice("genre", now);
    await consumePendingPin(snapshottedId, 42);

    expect(await getPendingPin()).toBe("genre");
    const accents = await db.select().from(practiceRequests);
    const first = accents.find((row) => row.category === "accents");
    expect(first?.consumedSessionId).toBeNull();
    expect(first?.cancelledAt).toEqual(expect.any(String));
  });

  it("keeps one pending pin when two pins race", async () => {
    await Promise.all([pinPractice("accents", now), pinPractice("genre", now)]);
    const pending = await pendingRows();
    expect(pending).toHaveLength(1);
    expect(["accents", "genre"]).toContain(pending[0]?.category);
  });
});
