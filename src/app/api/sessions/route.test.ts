import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { saveSession } from "@/modules/history-store/history-store";
import evaluationFixture from "@/test/fixtures/ai/evaluation.valid.json";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { AI_MODEL } from "@/config/ai";
import { SessionsGetResponse } from "@/contracts/api";
import { readResponseJson } from "@/test/read-response-json";
import { GET } from "./route";

async function clearSessions() {
  await db.delete(sessions).execute();
}

describe("GET /api/sessions", () => {
  beforeEach(async () => {
    await clearSessions();
  });

  it("returns one parsed view per row, including unreadable stored JSON", async () => {
    await saveSession({
      promptText: "Valid session",
      promptConstraints: JSON.stringify({
        cefrLevel: "B1",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: "Mon texte.",
      evaluationJson: JSON.stringify(evaluationFixture),
      cefrLevel: "B1",
    });

    await saveSession({
      promptText: "Residue legacy row",
      promptConstraints: "{}",
      writingText: "Garde mon texte.",
      evaluationJson: '{"score": 5}',
      cefrLevel: "A2",
    });

    await saveSession({
      promptText: "Broken JSON row",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: "Encore du texte.",
      evaluationJson: '"{oops"',
      cefrLevel: "A2",
    });

    const response = await GET();
    const body = await readResponseJson(response, SessionsGetResponse);

    expect(body.sessions).toHaveLength(3);

    const valid = body.sessions.find((s) => s.promptText === "Valid session");
    expect(valid).toBeDefined();
    if (!valid) return;
    expect(valid.evaluation).toEqual({ ok: true, value: evaluationFixture });
    expect(valid.promptLevel).toBe("B1");

    const residue = body.sessions.find(
      (s) => s.promptText === "Residue legacy row",
    );
    expect(residue).toBeDefined();
    if (!residue) return;
    expect(residue.evaluation).toEqual({ ok: false, reason: "unreadable" });
    expect(residue.promptLevel).toBeNull();

    const broken = body.sessions.find(
      (s) => s.promptText === "Broken JSON row",
    );
    expect(broken).toBeDefined();
    if (!broken) return;
    expect(broken.evaluation).toEqual({ ok: false, reason: "unreadable" });
    expect(broken.promptLevel).toBe("A2");
  });

  it("maps EvaluationV2 stored JSON to a readable placeholder Evaluation", async () => {
    await saveSession({
      promptText: "V2 session",
      promptConstraints: JSON.stringify({
        cefrLevel: "B1",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: "Mon texte.",
      evaluationJson: JSON.stringify({
        version: 2,
        dimensions: {
          grammatical_accuracy: { score: 4, comment: "a" },
          vocabulary: { score: 3, comment: "b" },
          coherence: { score: 4, comment: "c" },
          register_style: { score: 3, comment: "d" },
        },
        overallCefr: "B1",
        summary: "s",
        nextLevelTip: "Pour atteindre B2, travaille les connecteurs.",
        model: AI_MODEL,
        promptVersion: "evaluator@2",
        evaluatedAt: "2026-11-16T18:00:00.000Z",
      }),
      cefrLevel: "B1",
    });

    const response = await GET();
    const body = await readResponseJson(response, SessionsGetResponse);
    const v2 = body.sessions.find((s) => s.promptText === "V2 session");
    expect(v2).toBeDefined();
    if (!v2) return;
    expect(v2.evaluation).toEqual({
      ok: true,
      value: {
        overall_cefr: "B1",
        dimensions: {
          grammatical_accuracy: { score: 4, max: 6, comment: "a" },
          vocabulary: { score: 3, max: 6, comment: "b" },
          coherence: { score: 4, max: 6, comment: "c" },
          register_style: { score: 3, max: 6, comment: "d" },
        },
        tips: {
          per_dimension: {
            grammatical_accuracy: "a",
            vocabulary: "b",
            coherence: "c",
            register_style: "d",
          },
          holistic: "Pour atteindre B2, travaille les connecteurs.",
        },
      },
    });
  });
});
