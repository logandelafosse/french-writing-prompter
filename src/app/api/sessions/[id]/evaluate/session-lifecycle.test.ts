import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { corrections, levelChanges, sessions } from "@/db/schema";
import { clearEnvCache } from "@/server/env";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import { saveSession } from "@/modules/history-store/history-store";
import { getQuotaState } from "@/modules/quota-manager/quota-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { PromptPostResponse } from "@/contracts/api";
import { ErrorEnvelope } from "@/contracts/errors";
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
  await setLevel("A2", "manual");
  const { POST } = await import("../../../prompt/route");
  const created = await POST(
    new Request("http://localhost/api/prompt", { method: "POST" }),
  );
  expect(created.status).toBe(200);
  const body = await readResponseJson(created, PromptPostResponse);
  return body.session.id;
}

async function postEvaluate(
  sessionId: number,
  text: string,
  extraHeaders: Record<string, string> = {},
) {
  const { POST } = await import("./route");
  return POST(
    new Request(`http://localhost/api/sessions/${sessionId}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify({ text }),
    }),
    { params: Promise.resolve({ id: String(sessionId) }) },
  );
}

describe("evaluate session lifecycle", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    vi.stubEnv("OPENAI_API_KEY", "");
    clearEnvCache();
    vi.setSystemTime(new Date("2026-11-16T18:00:00.000Z"));
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
    await db.delete(levelChanges).execute();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    clearEnvCache();
  });

  it("persists the text before the AI call when FakeAiClient fails", async () => {
    await setLevel("A2", "manual");
    const session = await saveSession({
      promptText: "Écris sur le bayou.",
      promptConstraints: constraints,
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
      localDate: "2026-11-16",
    });

    const failed = await postEvaluate(session.id, "Mon texte à garder.", {
      "x-e2e-scenario": "failure",
    });
    expect(failed.status).toBe(502);
    expect(failed.headers.get("content-type")).toMatch(/json/);
    const failedBody = await readResponseJson(failed, ErrorEnvelope);
    expect(failedBody.error.code).toBe("AI_UNAVAILABLE");

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

    const evaluated = await postEvaluate(sessionId, "Un petit texte.");
    expect(evaluated.status).toBe(200);

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    expect(rows[0]?.promptLevel).toBe("A2");
    expect(rows[0]?.cefrLevel).toBe("B1");
  });

  it("is allowed when quota is exhausted", async () => {
    await setLevel("A2", "manual");
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

    const response = await postEvaluate(session.id, "Mon brouillon reste.");
    expect(response.status).toBe(200);
    expect((await getQuotaState()).remaining).toBe(0);
  });

  it("returns 409 ALREADY_EVALUATED on a second evaluate", async () => {
    const sessionId = await createPromptSession();

    const first = await postEvaluate(sessionId, "Un petit texte.");
    expect(first.status).toBe(200);

    const second = await postEvaluate(sessionId, "Un petit texte.");
    expect(second.status).toBe(409);
    const body = await readResponseJson(second, ConflictBody);
    expect(body.code).toBe("ALREADY_EVALUATED");
  });
});
