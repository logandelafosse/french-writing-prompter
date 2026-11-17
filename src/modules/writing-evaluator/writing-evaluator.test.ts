import { describe, it, expect, vi } from "vitest";
import { WritingEvaluator, type OpenAiClientLike } from "./writing-evaluator";
import path from "node:path";
import { catalog } from "@/modules/resources/catalog";
import { buildEvaluatorPrompt } from "./build-evaluator-prompt";
import { loadDlfLexicon } from "@/modules/dlf/load";
import {
  buildDlfIndex,
  estimateHintTokens,
  formatDlfHintSection,
} from "@/modules/dlf/lookup";
import { DLF_HINT_MAX_HITS, DLF_HINT_MAX_TOKENS } from "@/config/limits";
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

    expect(result.evaluation.dimensions).toHaveProperty("grammatical_accuracy");
    expect(result.evaluation.overallCefr).toBe("B1");
    expect(result.corrections.length).toBeGreaterThan(0);
    expect(result.raw.overall_cefr).toBe("B1");
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

  it("lists every catalog id with type and categories and no urls", () => {
    const built = buildEvaluatorPrompt({
      writing: "Texte.",
      promptText: "Consigne.",
      registre: "familier",
      dialect: DEFAULT_DIALECT,
    });
    expect(built.system).toMatch(/N'invente jamais d'URL ni d'ID/i);
    for (const entry of catalog) {
      expect(built.system).toContain(entry.id);
      expect(built.system).toContain(entry.type);
      expect(built.system).toContain(entry.title);
      expect(built.system).not.toContain(entry.url);
    }
  });

  it("injects a DLF gloss and Louisiana example for fixture hits in the text", async () => {
    const index = loadDlfLexicon(
      path.join(process.cwd(), "src/test/fixtures/dlf/lexicon.json"),
    );
    const mockClient: OpenAiClientLike = {
      chatCompletionJSON: vi.fn().mockResolvedValue(outputFixture()),
    };
    const evaluator = new WritingEvaluator(mockClient, index);
    await evaluator.evaluate(
      "Asteur on va au bayou.",
      makePrompt("B1"),
      DEFAULT_DIALECT,
    );
    const params = vi.mocked(mockClient.chatCompletionJSON).mock.calls[0]?.[1];
    const systemMsg = params?.messages.find((m) => m.role === "system");
    expect(systemMsg?.content).toContain("now, right now");
    expect(systemMsg?.content).toContain(
      "Asteure, j’vas essayer d’écrire à vous en cadjin.",
    );
    expect(systemMsg?.content).toMatch(/usage louisianais attesté/i);
  });

  it("caps and truncates DLF hint cards to the documented token budget", () => {
    const entries = Array.from({ length: 40 }, (_, i) => ({
      id: `w-${i}`,
      headword: `word${String(i).padStart(2, "0")}xxxx`,
      forms: [`word${String(i).padStart(2, "0")}xxxx`],
      senses: [
        {
          pos: "n.",
          glosses: ["x".repeat(80)],
          examples: [
            {
              louisiana_french_text: "y".repeat(80),
              translation: "z".repeat(80),
            },
          ],
        },
      ],
    }));
    const index = buildDlfIndex(entries);
    const cards = index.cardsForText(entries.map((e) => e.headword).join(" "));
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(DLF_HINT_MAX_HITS);
    expect(estimateHintTokens(formatDlfHintSection(cards))).toBeLessThanOrEqual(
      DLF_HINT_MAX_TOKENS,
    );
    const built = buildEvaluatorPrompt({
      writing: "Texte.",
      promptText: "Consigne.",
      registre: null,
      dialect: DEFAULT_DIALECT,
      dlfCards: cards,
    });
    expect(built.system).toContain(cards[0]?.headword);
  });

  it("lists active notes and omits deleted notes", () => {
    const built = buildEvaluatorPrompt({
      writing: "On a pris une barbotte.",
      promptText: "Consigne.",
      registre: "familier",
      dialect: DEFAULT_DIALECT,
      dialectNotes: [
        {
          scope: "word",
          form: "barbotte",
          learnerForm: "barbotte",
          rule: "On dit barbotte.",
          deletedAt: null,
        },
        {
          scope: "pattern",
          form: "avoir-mouvement",
          learnerForm: null,
          rule: "Avoir avec les verbes de mouvement.",
          deletedAt: null,
        },
        {
          scope: "word",
          form: "icitte",
          learnerForm: "icitte",
          rule: "On dit icitte.",
          deletedAt: "2026-11-01T00:00:00.000Z",
        },
      ],
    });
    expect(built.system).toContain(
      "Formes confirmées par l'apprenant — ne les signale JAMAIS",
    );
    expect(built.system).toContain("barbotte");
    expect(built.system).toContain("Avoir avec les verbes de mouvement.");
    expect(built.system).not.toContain("icitte");
  });
});
