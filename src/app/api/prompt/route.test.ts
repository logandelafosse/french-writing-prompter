import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { levelChanges, sessions } from "@/db/schema";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import { saveSession } from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { PromptPostResponse } from "@/contracts/api";
import { TodayGetResponse } from "@/contracts/today";
import { z } from "zod";
import { readResponseJson } from "@/test/read-response-json";
import { POST } from "./route";

const QuotaExhaustedBody = z.object({
  error: z.literal("QUOTA_EXHAUSTED"),
  resetsAt: z.string(),
});

describe("prompt route", () => {
  it("does not import db", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/prompt/route.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from ["']@\/db["']/);
    expect(source).not.toMatch(/from ["']@\/db\//);
  });
});

describe("POST /api/prompt quota", { concurrent: false }, () => {
  beforeEach(async () => {
    vi.setSystemTime(new Date("2026-11-14T12:00:00-06:00"));
    await db.delete(sessions).execute();
    await setLevel("B1", "manual");
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
    expect(body.session.id).toBeGreaterThan(0);
    expect(body.quota.remaining).toBeGreaterThanOrEqual(0);
  });

  it("persists prompt_meta_json and returns promptMeta", async () => {
    const response = await POST(
      new Request("http://localhost/api/prompt", { method: "POST" }),
    );
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, PromptPostResponse);
    expect(body.session.promptMeta.registre).toMatch(
      /^(formel|familier|mixt)$/,
    );
    expect(body.session.promptMeta.wordTarget).toEqual({ min: 250, max: 300 });

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, body.session.id));
    expect(rows[0]?.promptMetaJson).toBeTruthy();
  });

  it("returns promptMeta null for a legacy row without throwing", async () => {
    const saved = await saveSession({
      promptText: "legacy",
      promptConstraints: JSON.stringify({
        cefrLevel: "B1",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "B1",
      localDate: "2026-11-14",
    });

    const { GET } = await import("../today/route");
    const today = await GET();
    const body = await readResponseJson(today, TodayGetResponse);
    expect(body.activeSession).toEqual({
      id: saved.id,
      prompt: "legacy",
      promptMeta: null,
      draft: null,
    });
  });

  it("GET /api/today returns promptMeta after POST /api/prompt", async () => {
    const response = await POST(
      new Request("http://localhost/api/prompt", { method: "POST" }),
    );
    expect(response.status).toBe(200);
    const posted = await readResponseJson(response, PromptPostResponse);

    const { GET } = await import("../today/route");
    const today = await GET();
    const body = await readResponseJson(today, TodayGetResponse);
    expect(body.activeSession).toMatchObject({
      id: posted.session.id,
      prompt: posted.session.promptText,
      promptMeta: posted.session.promptMeta,
      draft: null,
    });
  });

  it("returns 400 when no CEFR level is set", async () => {
    await db.delete(levelChanges).execute();
    const response = await POST(
      new Request("http://localhost/api/prompt", { method: "POST" }),
    );
    expect(response.status).toBe(400);
    await readResponseJson(
      response,
      z.object({
        error: z.literal("No CEFR level set. Please set your level first."),
      }),
    );
  });

  it("never exceeds the daily max under concurrent requests", async () => {
    for (let i = 0; i < 2; i++) {
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

    const [first, second] = await Promise.all([
      POST(new Request("http://localhost/api/prompt", { method: "POST" })),
      POST(new Request("http://localhost/api/prompt", { method: "POST" })),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 429]);

    const rows = await db.select().from(sessions);
    const todayRows = rows.filter((row) => row.localDate === "2026-11-14");
    expect(todayRows).toHaveLength(3);
  });
});
