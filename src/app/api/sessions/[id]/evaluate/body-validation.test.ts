import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { corrections, sessions } from "@/db/schema";
import { saveSession, getSession } from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { readResponseJson } from "@/test/read-response-json";
import { ApiErrorBody } from "@/test/api-response-schemas";

vi.mock("@/modules/openai-client/openai-client", () => ({
  OpenAiClient: class {
    chatCompletionJSON = vi.fn();
  },
}));

async function clearSessions() {
  await db.delete(corrections).execute();
  await db.delete(sessions).execute();
}

async function postEvaluate(sessionId: number, body: unknown) {
  const { POST } = await import("./route");
  return POST(
    new Request(`http://localhost/api/sessions/${sessionId}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: String(sessionId) }) },
  );
}

describe("POST /api/sessions/:id/evaluate body validation", () => {
  beforeEach(async () => {
    await clearSessions();
  });

  it("returns 400 naming text when it is missing", async () => {
    const session = await saveSession({
      promptText: "Prompt",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
    });
    const response = await postEvaluate(session.id, {});
    expect(response.status).toBe(400);
    const json = await readResponseJson(response, ApiErrorBody);
    expect(json.error).toMatch(/text/i);
  });

  it("returns 400 for wrong types and leaves evaluation_json null", async () => {
    const session = await saveSession({
      promptText: "Prompt",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
    });

    const response = await postEvaluate(session.id, { text: 123 });

    expect(response.status).toBe(400);
    const json = await readResponseJson(response, ApiErrorBody);
    expect(json.error).toMatch(/text/i);

    const stored = await getSession(session.id);
    expect(stored?.evaluationJson).toBeNull();
    expect(stored?.writingText).toBeNull();
  });

  it("returns 400 for extra fields without persisting an evaluation", async () => {
    const session = await saveSession({
      promptText: "Prompt",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
    });

    const response = await postEvaluate(session.id, {
      text: "texte",
      extra: true,
    });

    expect(response.status).toBe(400);
    const json = await readResponseJson(response, ApiErrorBody);
    expect(json.error).toMatch(/extra/i);

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, session.id));
    expect(rows[0]?.evaluationJson).toBeNull();
  });
});
