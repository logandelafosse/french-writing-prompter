/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { WritingEvaluator } from "./writing-evaluator";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";

function makePrompt(cefr: string): WritingPrompt {
  return {
    text: "Décrivez votre ville natale en 100 mots.",
    constraints: { cefrLevel: cefr as any, dialect: "louisiana" },
  };
}

describe("WritingEvaluator", () => {
  const mockEvaluation = {
    dimensions: {
      grammatical_accuracy: { score: 4, max: 6, comment: "Good grammar" },
      vocabulary: { score: 3, max: 6, comment: "Decent vocab" },
      coherence: { score: 4, max: 6, comment: "Well structured" },
      register_style: { score: 3, max: 6, comment: "Ok register" },
    },
    overall_cefr: "B1",
    tips: {
      per_dimension: {
        grammatical_accuracy: "Work on conjugations",
        vocabulary: "Expand your word choice",
        coherence: "Use more connectors",
        register_style: "Vary your register",
      },
      holistic: "To reach B2, focus on more complex sentence structures.",
    },
  };

  it("returns a structured evaluation", async () => {
    const mockClient = {
      chatCompletionJSON: vi.fn().mockResolvedValue(mockEvaluation),
    };

    const evaluator = new WritingEvaluator(mockClient as any);
    const prompt = makePrompt("A2");
    const result = await evaluator.evaluate(
      "Ma ville est belle.",
      prompt,
      "louisiana"
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

    const callArgs = mockClient.chatCompletionJSON.mock.calls[0][0];
    const systemMsg = callArgs.messages.find(
      (m: any) => m.role === "system"
    );

    expect(systemMsg.content).toContain("Louisiana French");
    expect(systemMsg.content).toContain("chaoui");
    expect(systemMsg.content).toContain("être après");
  });

  it("includes the student writing and prompt in the user message", async () => {
    const mockClient = {
      chatCompletionJSON: vi.fn().mockResolvedValue(mockEvaluation),
    };

    const evaluator = new WritingEvaluator(mockClient as any);
    await evaluator.evaluate(
      "Mon texte en français.",
      makePrompt("B1"),
      "louisiana"
    );

    const callArgs = mockClient.chatCompletionJSON.mock.calls[0][0];
    const userMsg = callArgs.messages.find((m: any) => m.role === "user");

    expect(userMsg.content).toContain("Mon texte en français");
    expect(userMsg.content).toContain("Décrivez votre ville natale");
  });
});
