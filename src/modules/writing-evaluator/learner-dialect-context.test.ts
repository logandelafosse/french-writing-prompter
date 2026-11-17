import { describe, expect, it, vi } from "vitest";
import type { LearnerDialectNote } from "@/contracts/dialect-note";
import type { EvaluatorOutputDraft } from "@/contracts/evaluation";
import type { GeneratorModelOutput } from "@/contracts/prompt-meta";
import { type LearnerDialectContext } from "@/modules/dialect/learner-dialect-context";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { emptyDlfIndex } from "@/modules/dlf/lookup";
import {
  PromptGenerator,
  type OpenAiClientLike as GeneratorClient,
} from "@/modules/prompt-generator/prompt-generator";
import { WritingEvaluator, type OpenAiClientLike } from "./writing-evaluator";

const confirmed: LearnerDialectNote = {
  scope: "word",
  form: "a tombé",
  learnerForm: "a tombé",
  rule: "On dit a tombé.",
  deletedAt: null,
};

const writing = "Il a tombé hier.";

function modelMistake(): EvaluatorOutputDraft {
  return {
    dimensions: {
      grammatical_accuracy: { score: 3, comment: "ok" },
      vocabulary: { score: 4, comment: "ok" },
      coherence: { score: 4, comment: "ok" },
      register_style: { score: 4, comment: "ok" },
    },
    overall_cefr: "B1",
    summary: "Résumé.",
    next_level_tip: "Pour atteindre B2, continue.",
    corrections: [
      {
        kind: "mistake",
        quote: "a tombé",
        occurrence: 1,
        suggestion: "est tombé",
        explanation: "Auxiliaire.",
        category: "accord",
        question: null,
        rule_if_dialect: "Si c'est chez toi, on le note.",
        dlf_headword: null,
        resource_ids: [],
        context_quote: null,
        dialect_example: null,
        dialect_lemma: null,
        dialect_pattern: null,
      },
    ],
  };
}

const modelPrompt: GeneratorModelOutput = {
  text: "C'est samedi matin chez ta grand-mère à Lafayette. Raconte ce qui se passe, en style familier.",
  genre: "récit",
  tense: "présent",
  tone: "chaleureux",
  registre: "familier",
  topic: "famille",
  topic_tags: ["famille"],
};

function client(): OpenAiClientLike {
  return {
    chatCompletionJSON: vi.fn().mockResolvedValue(modelMistake()),
  };
}

function generatorClient(): GeneratorClient {
  return {
    chatCompletionJSON: vi.fn().mockResolvedValue(modelPrompt),
  };
}

describe("LearnerDialectContext", () => {
  it("active notes suppress dialect Mistakes", async () => {
    const withNotes: LearnerDialectContext = {
      dialect: DEFAULT_DIALECT,
      notes: [confirmed],
      dlf: emptyDlfIndex(),
    };
    const generated = await new PromptGenerator(generatorClient()).generate(
      "B1",
      withNotes,
    );
    expect(generated.constraints.dialect).toBe(DEFAULT_DIALECT);
    const suppressed = await new WritingEvaluator(client()).evaluate(
      writing,
      generated,
      withNotes,
    );
    expect(suppressed.corrections).toEqual([]);

    const omitted: LearnerDialectContext = {
      dialect: DEFAULT_DIALECT,
      dlf: emptyDlfIndex(),
    };
    const flagged = await new WritingEvaluator(client()).evaluate(
      writing,
      generated,
      omitted,
    );
    expect(flagged.corrections.map((item) => item.kind)).toEqual(["mistake"]);
    expect(flagged.corrections.map((item) => item.quote)).toEqual(["a tombé"]);
  });
});
