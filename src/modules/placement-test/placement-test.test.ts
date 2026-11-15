import { describe, it, expect, vi } from "vitest";
import {
  PlacementTest,
  type EvaluatorLike,
  type PromptGeneratorLike,
} from "./placement-test";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import type { Evaluation } from "@/modules/writing-evaluator/writing-evaluator";
import type { CefrLevel } from "@/contracts/cefr";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";

function makePrompt(level: CefrLevel): WritingPrompt {
  return {
    text: `Prompt for ${level}`,
    constraints: { cefrLevel: level, dialect: DEFAULT_DIALECT },
  };
}

function makeEvaluation(cefr: CefrLevel): Evaluation {
  return {
    dimensions: {
      grammatical_accuracy: { score: 3, max: 6, comment: "" },
      vocabulary: { score: 3, max: 6, comment: "" },
      coherence: { score: 3, max: 6, comment: "" },
      register_style: { score: 3, max: 6, comment: "" },
    },
    overall_cefr: cefr,
    tips: {
      per_dimension: {
        grammatical_accuracy: "",
        vocabulary: "",
        coherence: "",
        register_style: "",
      },
      holistic: "",
    },
  };
}

describe("PlacementTest", () => {
  function createPlacementTest() {
    const mockPromptGenerator: PromptGeneratorLike = {
      generate: vi
        .fn()
        .mockResolvedValueOnce(makePrompt("A2"))
        .mockResolvedValueOnce(makePrompt("B1"))
        .mockResolvedValueOnce(makePrompt("B2")),
    };

    const mockEvaluator: EvaluatorLike = {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce(makeEvaluation("A2"))
        .mockResolvedValueOnce(makeEvaluation("B1"))
        .mockResolvedValueOnce(makeEvaluation("B1")),
    };

    return new PlacementTest(
      mockPromptGenerator,
      mockEvaluator,
      DEFAULT_DIALECT,
    );
  }

  it("begins the test and returns the first prompt", async () => {
    const test = createPlacementTest();
    const prompt = await test.start();
    expect(prompt.text).toBe("Prompt for A2");
    expect(test.getState()).toBe("waiting_for_writing");
  });

  it("throws if started when not idle", async () => {
    const test = createPlacementTest();
    await test.start();
    await expect(test.start()).rejects.toThrow("Test already in progress");
  });

  it("returns final result after 3rd submission", async () => {
    const test = createPlacementTest();
    await test.start();
    await test.submitWriting("w1");
    await test.submitWriting("w2");
    const result = await test.submitWriting("w3");
    if (result.type !== "complete") throw new Error("expected complete");
    expect(result.finalLevel).toBe("B1");
  });

  it("computes median CEFR level", () => {
    expect(PlacementTest.computeLevel(["A1", "B2", "B1"])).toBe("B1");
  });
});
