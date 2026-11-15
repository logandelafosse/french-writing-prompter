import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { saveSession, getSession } from "@/modules/history-store/history-store";
import { AiOutputError } from "@/modules/openai-client/ai-output-error";

const evaluateMock = vi.fn();

vi.mock("@/modules/openai-client/openai-client", () => ({
  OpenAiClient: class {
    chatCompletionJSON = evaluateMock;
  },
}));

async function clearSessions() {
  await db.delete(sessions).execute();
}

describe("POST /api/evaluate", () => {
  beforeEach(async () => {
    await clearSessions();
    evaluateMock.mockReset();
  });

  it("returns 502 and leaves evaluation_json null when the model output is invalid", async () => {
    const session = await saveSession({
      promptText: "Écrivez sur la Louisiane.",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: "louisiana",
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
    });

    evaluateMock.mockRejectedValue(
      new AiOutputError("schema_mismatch", "bad shape", new Error("zod")),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writing: "Mon texte.", sessionId: session.id }),
      }),
    );

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe("schema_mismatch");

    const stored = await getSession(session.id);
    expect(stored?.evaluationJson).toBeNull();
  });
});
