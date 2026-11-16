import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { levelChanges, sessions } from "@/db/schema";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import { TodayGetResponse } from "@/contracts/today";
import { readResponseJson } from "@/test/read-response-json";

describe("GET /api/today advancement", () => {
  beforeEach(async () => {
    vi.setSystemTime(new Date("2026-11-16T18:00:00.000Z"));
    await db.delete(sessions).execute();
    await db.delete(levelChanges).execute();
  });

  it("returns advancement after auto change until a later session exists", async () => {
    await setLevel("B1", "manual");
    const auto = await setLevel("B2", "auto");

    const { GET } = await import("./route");
    let response = await GET();
    let body = await readResponseJson(response, TodayGetResponse);
    expect(body.advancement?.id).toBe(auto.id);

    await db.insert(sessions).values({
      promptText: "Nouvelle consigne",
      promptConstraints: "{}",
      writingText: null,
      evaluationJson: null,
      cefrLevel: "B2",
      createdAt: new Date("2026-11-16T19:00:00.000Z").toISOString(),
      kind: "daily",
      localDate: "2026-11-16",
      status: "active",
    });

    response = await GET();
    body = await readResponseJson(response, TodayGetResponse);
    expect(body.advancement).toBeNull();
  });
});
