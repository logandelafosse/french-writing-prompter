import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { saveSession, getSession } from "@/modules/history-store/history-store";

vi.mock("@/modules/openai-client/openai-client", () => ({
  OpenAiClient: class {
    chatCompletionJSON = vi.fn();
  },
}));

async function clearSessions() {
  await db.delete(sessions).execute();
}

describe("POST /api/evaluate body validation", () => {
  beforeEach(async () => {
    await clearSessions();
  });

  it("returns 400 naming sessionId when it is missing", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writing: "Mon texte." }),
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/sessionId/i);
  });

  it("returns 400 for wrong types and leaves evaluation_json null", async () => {
    const session = await saveSession({
      promptText: "Prompt",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: "louisiana",
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writing: 123,
          sessionId: session.id,
        }),
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/writing/i);

    const stored = await getSession(session.id);
    expect(stored?.evaluationJson).toBeNull();
    expect(stored?.writingText).toBeNull();
  });

  it("returns 400 for extra fields without persisting an evaluation", async () => {
    const session = await saveSession({
      promptText: "Prompt",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: "louisiana",
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writing: "texte",
          sessionId: session.id,
          extra: true,
        }),
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/extra/i);

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, session.id));
    expect(rows[0]?.evaluationJson).toBeNull();
  });
});
