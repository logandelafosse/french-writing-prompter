import { describe, it, expect, vi } from "vitest";
import { WritingEvaluator, type OpenAiClientLike } from "./writing-evaluator";
import { buildEvaluatorPrompt } from "./build-evaluator-prompt";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import type { CefrLevel } from "@/contracts/cefr";
import { MISTAKE_CATEGORY_IDS } from "@/contracts/mistake-category";
import { EvaluatorOutputSchema } from "@/contracts/evaluation";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { renderForEvaluator } from "@/modules/dialect/render";
import { parseJson } from "@/lib/json";
import okMixedKinds from "./__fixtures__/ok-mixed-kinds.json";

function makePrompt(cefr: CefrLevel): WritingPrompt {
  return {
    text: "Décrivez votre ville natale en 100 mots.",
    meta: {
      genre: "description",
      tense: "présent",
      tone: "",
      registre: "familier",
      wordTarget: { min: 80, max: 120 },
      topic: "ville",
      topicTags: [],
    },
    constraints: { cefrLevel: cefr, dialect: DEFAULT_DIALECT },
  };
}

function outputFixture() {
  const parsed = parseJson(EvaluatorOutputSchema, JSON.stringify(okMixedKinds));
  if (!parsed.ok) throw new Error(String(parsed.cause));
  return parsed.value;
}

describe("WritingEvaluator", () => {
  it("returns a structured evaluator output", async () => {
    const mockClient: OpenAiClientLike = {
      chatCompletionJSON: vi.fn().mockResolvedValue(outputFixture()),
    };
    const evaluator = new WritingEvaluator(mockClient);
    const result = await evaluator.evaluate(
      "Ma ville est belle.",
      makePrompt("A2"),
      DEFAULT_DIALECT,
    );

    expect(result.dimensions).toHaveProperty("grammatical_accuracy");
    expect(result.overall_cefr).toBe("B1");
    expect(result.corrections.length).toBeGreaterThan(0);
  });

  it("embeds renderForEvaluator() output in the system prompt", async () => {
    const mockClient: OpenAiClientLike = {
      chatCompletionJSON: vi.fn().mockResolvedValue(outputFixture()),
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
      chatCompletionJSON: vi.fn().mockResolvedValue(outputFixture()),
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

  it("evaluator prompt is French and forbids penalising Standard French", () => {
    const built = buildEvaluatorPrompt({
      writing: "Texte.",
      promptText: "Consigne.",
      registre: "formel",
      dialect: DEFAULT_DIALECT,
    });
    expect(built.version).toBe("evaluator@2");
    expect(built.system).toMatch(/tuteur de français louisianais/i);
    expect(built.system).toContain("mistake");
    expect(built.system).toContain("standard");
    expect(built.system).toContain("dialect_check");
    expect(built.system).toMatch(/français standard n'est jamais une faute/i);
    expect(built.system).toContain("overall_cefr");
    expect(built.system).toContain("formel");
    for (const id of MISTAKE_CATEGORY_IDS) {
      expect(built.system).toContain(id);
    }
  });
});
