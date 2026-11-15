import { describe, it, expect, vi } from "vitest";
import { WritingEvaluator, type OpenAiClientLike } from "./writing-evaluator";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import type { CefrLevel } from "@/contracts/cefr";
import evaluationFixture from "@/test/fixtures/ai/evaluation.valid.json";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { renderForEvaluator } from "@/modules/dialect/render";

function makePrompt(cefr: CefrLevel): WritingPrompt {
  return {
    text: "Décrivez votre ville natale en 100 mots.",
    constraints: { cefrLevel: cefr, dialect: DEFAULT_DIALECT },
  };
}

describe("WritingEvaluator", () => {
  it("returns a structured evaluation", async () => {
    const mockClient: OpenAiClientLike = {
      chatCompletionJSON: vi.fn().mockResolvedValue(evaluationFixture),
    };
    const evaluator = new WritingEvaluator(mockClient);
    const result = await evaluator.evaluate(
      "Ma ville est belle.",
      makePrompt("A2"),
      DEFAULT_DIALECT,
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

  it("embeds renderForEvaluator() output in the system prompt", async () => {
    const mockClient: OpenAiClientLike = {
      chatCompletionJSON: vi.fn().mockResolvedValue(evaluationFixture),
    };
    const evaluator = new WritingEvaluator(mockClient);
    await evaluator.evaluate(
      "Test writing.",
      makePrompt("A2"),
      DEFAULT_DIALECT,
    );

    const params = vi.mocked(mockClient.chatCompletionJSON).mock.calls[0]?.[1];
    const systemMsg = params?.messages.find((m) => m.role === "system");
    expect(systemMsg?.content).toContain(renderForEvaluator());
    expect(systemMsg?.content).not.toContain('"overall_cefr"');
  });

  it("includes the student writing and prompt in the user message", async () => {
    const mockClient: OpenAiClientLike = {
      chatCompletionJSON: vi.fn().mockResolvedValue(evaluationFixture),
    };
    const evaluator = new WritingEvaluator(mockClient);
    await evaluator.evaluate(
      "Mon texte en français.",
      makePrompt("B1"),
      DEFAULT_DIALECT,
    );

    const params = vi.mocked(mockClient.chatCompletionJSON).mock.calls[0]?.[1];
    const userMsg = params?.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("Mon texte en français.");
    expect(userMsg?.content).toContain("Décrivez votre ville natale");
  });
});
