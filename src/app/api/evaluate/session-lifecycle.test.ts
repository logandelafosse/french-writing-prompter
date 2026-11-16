import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { levelChanges, sessions } from "@/db/schema";
import { clearEnvCache } from "@/server/env";
import { setTrackerLevel } from "@/modules/cefr-tracker/tracker-store";
import { saveSession } from "@/modules/history-store/history-store";
import { getQuotaState } from "@/modules/quota-manager/quota-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { PromptPostResponse } from "@/contracts/api";
import { readResponseJson } from "@/test/read-response-json";

const ConflictBody = z.object({
  code: z.string(),
  error: z.string(),
});

const constraints = JSON.stringify({
  cefrLevel: "A2",
  dialect: DEFAULT_DIALECT,
});

async function createPromptSession(): Promise<number> {
  await setTrackerLevel("A2", "manual");
  const { POST } = await import("../prompt/route");
  const created = await POST(
    new Request("http://localhost/api/prompt", { method: "POST" }),
  );
  expect(created.status).toBe(200);
  const body = await readResponseJson(created, PromptPostResponse);
  return body.session.id;
}

describe("evaluate session lifecycle", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    vi.stubEnv("OPENAI_API_KEY", "");
    clearEnvCache();
    vi.setSystemTime(new Date("2026-11-16T18:00:00.000Z"));
    await db.delete(sessions).execute();
    await db.delete(levelChanges).execute();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    clearEnvCache();
  });

  it("persists the text before the AI call when FakeAiClient fails", async () => {
    const session = await saveSession({
      promptText: "Écris sur le bayou.",
      promptConstraints: constraints,
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
      localDate: "2026-11-16",
    });

    const { POST } = await import("./route");
    await expect(
      POST(
        new Request("http://localhost/api/evaluate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-e2e-scenario": "failure",
          },
          body: JSON.stringify({
            writing: "Mon texte à garder.",
            sessionId: session.id,
          }),
        }),
      ),
    ).rejects.toThrow(/AI service error/);

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, session.id));
    expect(rows[0]?.writingText).toBe("Mon texte à garder.");
    expect(rows[0]?.status).toBe("active");
    expect(rows[0]?.evaluationJson).toBeNull();
  });

  it("keeps prompt_level at the generated level and stores the evaluated level on cefr_level", async () => {
    const sessionId = await createPromptSession();

    const { POST } = await import("./route");
    const evaluated = await POST(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writing: "Un petit texte.", sessionId }),
      }),
    );
    expect(evaluated.status).toBe(200);

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    expect(rows[0]?.promptLevel).toBe("A2");
    expect(rows[0]?.cefrLevel).toBe("B1");
  });

  it("is allowed when quota is exhausted", async () => {
    const session = await saveSession({
      promptText: "Troisième consigne",
      promptConstraints: constraints,
      writingText: "Mon brouillon.",
      evaluationJson: null,
      cefrLevel: "A2",
      localDate: "2026-11-16",
      status: "active",
      promptLevel: "A2",
    });
    await saveSession({
      promptText: "Première",
      promptConstraints: constraints,
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
      localDate: "2026-11-16",
      status: "abandoned",
    });
    await saveSession({
      promptText: "Deuxième",
      promptConstraints: constraints,
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
      localDate: "2026-11-16",
      status: "abandoned",
    });
    expect((await getQuotaState()).remaining).toBe(0);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writing: "Mon brouillon reste.",
          sessionId: session.id,
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect((await getQuotaState()).remaining).toBe(0);
  });

  it("returns 409 ALREADY_EVALUATED on a second evaluate", async () => {
    const sessionId = await createPromptSession();

    const { POST } = await import("./route");
    const requestBody = JSON.stringify({
      writing: "Un petit texte.",
      sessionId,
    });
    const first = await POST(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      }),
    );
    expect(first.status).toBe(200);

    const second = await POST(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      }),
    );
    expect(second.status).toBe(409);
    const body = await readResponseJson(second, ConflictBody);
    expect(body.code).toBe("ALREADY_EVALUATED");
  });
});
