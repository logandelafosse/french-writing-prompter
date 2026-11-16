import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clearEnvCache } from "@/server/env";
import type { z } from "zod";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { parseJson } from "@/lib/json";
import { saveSession, getSession } from "@/modules/history-store/history-store";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import { AiOutputError } from "@/modules/openai-client/ai-output-error";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { readResponseJson } from "@/test/read-response-json";
import { ErrorEnvelope } from "@/contracts/errors";

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
    vi.stubEnv("AI_CLIENT", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    clearEnvCache();
    await clearSessions();
    evaluateMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("returns 502 and leaves evaluation_json null when the model output is invalid", async () => {
    await setLevel("A2", "manual");
    const session = await saveSession({
      promptText: "Écrivez sur la Louisiane.",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
    });

    const fakeMalformedModelText = '{"score": 5}';
    evaluateMock.mockImplementation((schema: z.ZodType) => {
      const result = parseJson(schema, fakeMalformedModelText);
      if (result.ok) {
        return Promise.resolve(result.value);
      }
      if (result.reason === "invalid_json") {
        return Promise.reject(
          new AiOutputError(
            "invalid_json",
            "AI response was not valid JSON",
            result.cause,
          ),
        );
      }
      return Promise.reject(
        new AiOutputError(
          "schema_mismatch",
          "AI response did not match the expected schema",
          result.cause,
        ),
      );
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writing: "Mon texte.", sessionId: session.id }),
      }),
    );

    expect(response.status).toBe(502);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("AI_INVALID_OUTPUT");

    const stored = await getSession(session.id);
    expect(stored?.evaluationJson).toBeNull();
  });
});
