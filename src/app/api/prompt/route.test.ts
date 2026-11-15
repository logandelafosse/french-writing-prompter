import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { setTrackerLevel } from "@/modules/cefr-tracker/tracker-store";
import { saveSession } from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { PromptPostResponse } from "@/contracts/api";
import { z } from "zod";
import { readResponseJson } from "@/test/read-response-json";
import { POST } from "./route";

const QuotaExhaustedBody = z.object({
  error: z.literal("QUOTA_EXHAUSTED"),
  resetsAt: z.string(),
});

describe("POST /api/prompt quota", { concurrent: false }, () => {
  beforeEach(async () => {
    vi.setSystemTime(new Date("2026-11-14T12:00:00-06:00"));
    await db.delete(sessions).execute();
    await setTrackerLevel("B1", "manual");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refuses a fourth daily prompt on the same local date", async () => {
    for (let i = 0; i < 3; i++) {
      await saveSession({
        promptText: `p${i}`,
        promptConstraints: JSON.stringify({
          cefrLevel: "B1",
          dialect: DEFAULT_DIALECT,
        }),
        writingText: null,
        evaluationJson: null,
        cefrLevel: "B1",
        localDate: "2026-11-14",
      });
    }

    const response = await POST(
      new Request("http://localhost/api/prompt", { method: "POST" }),
    );
    expect(response.status).toBe(429);
    const body = await readResponseJson(response, QuotaExhaustedBody);
    expect(body.resetsAt).toMatch(/2026-11-15/);
  });

  it("does not count sessions from yesterday's local date", async () => {
    await saveSession({
      promptText: "yesterday",
      promptConstraints: JSON.stringify({
        cefrLevel: "B1",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "B1",
      localDate: "2026-11-13",
    });

    const response = await POST(
      new Request("http://localhost/api/prompt", { method: "POST" }),
    );
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, PromptPostResponse);
    expect(body.sessionId).toBeGreaterThan(0);
  });
});
