import { describe, it, expect, vi } from "vitest";
import { WritingEvaluator, type OpenAiClientLike } from "./writing-evaluator";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import type { CefrLevel } from "@/contracts/cefr";
import evaluationFixture from "@/test/fixtures/ai/evaluation.valid.json";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";

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
    expect(result).toHaveProperty("overall_cefr");
  });
});
