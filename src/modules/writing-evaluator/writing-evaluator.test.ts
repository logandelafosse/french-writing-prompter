/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { WritingEvaluator } from "./writing-evaluator";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import evaluationFixture from "@/test/fixtures/ai/evaluation.valid.json";

function makePrompt(cefr: string): WritingPrompt {
  return {
    text: "Décrivez votre ville natale en 100 mots.",
    constraints: { cefrLevel: cefr as any, dialect: "louisiana" },
  };
}

describe("WritingEvaluator", () => {
  const mockEvaluation = evaluationFixture;

  it("returns a structured evaluation", async () => {
    const mockClient = {
      chatCompletionJSON: vi.fn().mockResolvedValue(mockEvaluation),
    };

    const evaluator = new WritingEvaluator(mockClient as any);
    const prompt = makePrompt("A2");
    const result = await evaluator.evaluate(
      "Ma ville est belle.",
      prompt,
      "louisiana",
    );

    expect(result).toHaveProperty("dimensions");
    expect(result.dimensions).toHaveProperty("grammatical_accuracy");
    expect(result.dimensions).toHaveProperty("vocabulary");
    expect(result.dimensions).toHaveProperty("coherence");
    expect(result.dimensions).toHaveProperty("register_style");
    expect(result).toHaveProperty("overall_cefr");
    expect(result).toHaveProperty("tips");
    expect(result.tips).toHaveProperty("per_dimension");
    expect(result.tips).toHaveProperty("holistic");
  });

  it("includes Louisiana French dialect rules in system prompt", async () => {
    const mockClient = {
      chatCompletionJSON: vi.fn().mockResolvedValue(mockEvaluation),
    };

    const evaluator = new WritingEvaluator(mockClient as any);
    await evaluator.evaluate("Test writing.", makePrompt("A2"), "louisiana");

    const callArgs = mockClient.chatCompletionJSON.mock.calls[0];
    expect(callArgs).toBeDefined();
    const params = callArgs?.[1];
    if (params === undefined)
      throw new Error("expected chatCompletionJSON call");
    const systemMsg = params.messages.find((m: any) => m.role === "system");

    expect(systemMsg.content).toContain("Louisiana French");
    expect(systemMsg.content).toContain("chaoui");
    expect(systemMsg.content).toContain("être après");
    expect(systemMsg.content).not.toContain('"overall_cefr"');
  });

  it("includes the student writing and prompt in the user message", async () => {
    const mockClient = {
      chatCompletionJSON: vi.fn().mockResolvedValue(mockEvaluation),
    };

    const evaluator = new WritingEvaluator(mockClient as any);
    await evaluator.evaluate(
      "Mon texte en français.",
      makePrompt("B1"),
      "louisiana",
    );

    const callArgs = mockClient.chatCompletionJSON.mock.calls[0];
    const params = callArgs?.[1];
    if (params === undefined)
      throw new Error("expected chatCompletionJSON call");
    const userMsg = params.messages.find((m: any) => m.role === "user");

    expect(userMsg.content).toContain("Mon texte en français");
    expect(userMsg.content).toContain("Décrivez votre ville natale");
  });
});
