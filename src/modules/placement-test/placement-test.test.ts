/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { PlacementTest } from "./placement-test";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import type { Evaluation } from "@/modules/writing-evaluator/writing-evaluator";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";

function makePrompt(level: string): WritingPrompt {
  return {
    text: `Prompt for ${level}`,
    constraints: { cefrLevel: level as any, dialect: DEFAULT_DIALECT },
  };
}

function makeEvaluation(cefr: string): Evaluation {
  return {
    dimensions: {
      grammatical_accuracy: { score: 3, max: 6, comment: "" },
      vocabulary: { score: 3, max: 6, comment: "" },
      coherence: { score: 3, max: 6, comment: "" },
      register_style: { score: 3, max: 6, comment: "" },
    },
    overall_cefr: cefr as any,
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
    const mockPromptGenerator = {
      generate: vi
        .fn()
        .mockResolvedValueOnce(makePrompt("A2"))
        .mockResolvedValueOnce(makePrompt("B1"))
        .mockResolvedValueOnce(makePrompt("B2")),
    };

    const mockEvaluator = {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce(makeEvaluation("A2"))
        .mockResolvedValueOnce(makeEvaluation("B1"))
        .mockResolvedValueOnce(makeEvaluation("B1")),
    };

    return new PlacementTest(
      mockPromptGenerator as any,
      mockEvaluator as any,
      DEFAULT_DIALECT,
    );
  }

  describe("start", () => {
    it("begins the test and returns the first prompt", async () => {
      const test = createPlacementTest();
      const prompt = await test.start();

      expect(prompt.text).toBe("Prompt for A2");
      expect(test.getState()).toBe("waiting_for_writing");
      expect(test.getCurrentStep()).toBe(1);
    });

    it("throws if started when not idle", async () => {
      const test = createPlacementTest();
      await test.start();
      await expect(test.start()).rejects.toThrow("Test already in progress");
    });
  });

  describe("submitWriting", () => {
    it("evaluates writing and returns next prompt for step 1", async () => {
      const test = createPlacementTest();
      await test.start();

      const result = await test.submitWriting("My writing 1");
      if (result.type !== "next_prompt")
        throw new Error("expected next_prompt");
      expect(result.prompt.text).toBe("Prompt for B1");
      expect(test.getCurrentStep()).toBe(2);
      expect(test.getState()).toBe("waiting_for_writing");
    });

    it("evaluates writing and returns next prompt for step 2", async () => {
      const test = createPlacementTest();
      await test.start();
      await test.submitWriting("w1");

      const result = await test.submitWriting("w2");
      if (result.type !== "next_prompt")
        throw new Error("expected next_prompt");
      expect(result.prompt.text).toBe("Prompt for B2");
      expect(test.getCurrentStep()).toBe(3);
    });

    it("returns final result after 3rd submission", async () => {
      const test = createPlacementTest();
      await test.start();
      await test.submitWriting("w1");
      await test.submitWriting("w2");

      const result = await test.submitWriting("w3");
      if (result.type !== "complete") throw new Error("expected complete");
      expect(result.finalLevel).toBe("B1");
      expect(result.evaluations).toHaveLength(3);
      expect(test.getState()).toBe("complete");
    });

    it("throws if no writing provided", async () => {
      const test = createPlacementTest();
      await test.start();
      await expect(test.submitWriting("")).rejects.toThrow(
        "Writing text is required",
      );
    });

    it("throws if called in idle state", async () => {
      const test = createPlacementTest();
      await expect(test.submitWriting("test")).rejects.toThrow(
        "Test not in progress",
      );
    });
  });

  describe("getState and getCurrentStep", () => {
    it("starts in idle state with step 0", () => {
      const test = createPlacementTest();
      expect(test.getState()).toBe("idle");
      expect(test.getCurrentStep()).toBe(0);
    });
  });

  describe("CEFR level computation", () => {
    it("uses median of three evaluations", () => {
      const levels = ["A1", "B2", "B1"] as const;
      const result = PlacementTest.computeLevel(levels as any);
      expect(result).toBe("B1");
    });

    it("handles all same level", () => {
      const levels = ["A2", "A2", "A2"] as const;
      const result = PlacementTest.computeLevel(levels as any);
      expect(result).toBe("A2");
    });
  });
});
