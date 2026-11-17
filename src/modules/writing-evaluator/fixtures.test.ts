import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AiOutputError } from "@/modules/openai-client/ai-output-error";
import { parseJson } from "@/lib/json";
import {
  EvaluatorOutputSchema,
  type EvaluatorOutputDraft,
} from "@/contracts/evaluation";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import { WritingEvaluator, type OpenAiClientLike } from "./writing-evaluator";

const DIR = path.join(import.meta.dirname, "__fixtures__");
const writing =
  "Maintenant je vas au bayou. Les enfant jouent. J'ai vu les enfant près du pont.";

function load(name: string): string {
  return fs.readFileSync(path.join(DIR, name), "utf8");
}

function throughChatCompletionJSON(text: string): EvaluatorOutputDraft {
  const strict = parseJson(EvaluatorOutputSchema, text);
  if (strict.ok) return strict.value;
  if (strict.reason === "invalid_json") {
    throw new AiOutputError(
      "invalid_json",
      "AI response was not valid JSON",
      strict.cause,
    );
  }
  throw new AiOutputError(
    "schema_mismatch",
    "AI response did not match the expected schema",
    strict.cause,
  );
}

const prompt: WritingPrompt = {
  text: "Consigne.",
  constraints: { cefrLevel: "B1", dialect: DEFAULT_DIALECT },
};

async function correctionsFrom(raw: EvaluatorOutputDraft, text: string) {
  const client: OpenAiClientLike = {
    chatCompletionJSON: vi.fn().mockResolvedValue(raw),
  };
  let n = 0;
  const result = await new WritingEvaluator(client).evaluate(
    text,
    prompt,
    DEFAULT_DIALECT,
    {
      sessionId: 7,
      now: () => new Date("2026-11-16T18:00:00.000Z"),
      createId: () => `fix-${++n}`,
    },
  );
  return result.corrections;
}

async function processFixture(name: string) {
  const raw = throughChatCompletionJSON(load(name));
  return (await correctionsFrom(raw, writing)).map((c) => ({
    id: c.id,
    ordinal: c.ordinal,
    kind: c.kind,
    quote: c.quote,
    span: c.span,
    anchor: c.anchor,
    category: c.category,
    question: c.question,
    explanation: c.explanation,
  }));
}

describe("evaluator fixtures", () => {
  it("ok-standard-louisiana produces ma voiture as standard", async () => {
    const louisianaWriting = "J'arrive avec ma voiture. Les enfant jouent.";
    const raw = throughChatCompletionJSON(load("ok-standard-louisiana.json"));
    const corrections = (await correctionsFrom(raw, louisianaWriting)).map(
      (c) => ({
        kind: c.kind,
        quote: c.quote,
        suggestion: c.suggestion,
        span: c.span,
      }),
    );
    expect(corrections).toEqual([
      {
        kind: "standard",
        quote: "ma voiture",
        suggestion: "mon char",
        span: {
          start: louisianaWriting.indexOf("ma voiture"),
          end: louisianaWriting.indexOf("ma voiture") + "ma voiture".length,
        },
      },
      {
        kind: "mistake",
        quote: "Les enfant",
        suggestion: "Les enfants",
        span: {
          start: louisianaWriting.indexOf("Les enfant"),
          end: louisianaWriting.indexOf("Les enfant") + "Les enfant".length,
        },
      },
    ]);
  });

  it("ok-mixed-kinds produces stable corrections", async () => {
    expect(await processFixture("ok-mixed-kinds.json")).toEqual([
      {
        id: "fix-1",
        ordinal: 1,
        kind: "standard",
        quote: "Maintenant",
        span: { start: 0, end: 10 },
        anchor: "exact",
        category: null,
        question: null,
        explanation: "Préférence louisianaise, pas une faute.",
      },
      {
        id: "fix-2",
        ordinal: 2,
        kind: "dialect_check",
        quote: "je vas",
        span: { start: 11, end: 17 },
        anchor: "exact",
        category: "conjugaison",
        question:
          throughChatCompletionJSON(
            load("ok-mixed-kinds.json"),
          ).corrections.find((c) => c.kind === "dialect_check")?.question ??
          null,
        explanation: "Je te demande si c'est voulu.",
      },
      {
        id: "fix-3",
        ordinal: 3,
        kind: "mistake",
        quote: "Les enfant",
        span: { start: 28, end: 38 },
        anchor: "exact",
        category: "accord",
        question: null,
        explanation: "L'accord du nom au pluriel manque.",
      },
    ]);
  });

  it("quote-not-found stays unanchored", async () => {
    expect(await processFixture("quote-not-found.json")).toEqual([
      {
        id: "fix-1",
        ordinal: 1,
        kind: "mistake",
        quote: "xyzzy-not-in-text",
        span: null,
        anchor: "none",
        category: "orthographe",
        question: null,
        explanation: "Citation absente du texte.",
      },
    ]);
  });

  it("quote-wrong-case-curly-apostrophe normalizes", async () => {
    expect(
      await processFixture("quote-wrong-case-curly-apostrophe.json"),
    ).toEqual([
      {
        id: "fix-1",
        ordinal: 1,
        kind: "standard",
        quote: "MAINTENANT",
        span: { start: 0, end: 10 },
        anchor: "normalized",
        category: null,
        question: null,
        explanation: "Même mot, casse différente.",
      },
      {
        id: "fix-2",
        ordinal: 2,
        kind: "mistake",
        quote: "j\u2019ai",
        span: { start: 47, end: 51 },
        anchor: "normalized",
        category: "orthographe",
        question: null,
        explanation: "Apostrophe courbe.",
      },
    ]);
  });

  it("duplicate-quote-occurrence-2 hits the second enfant", async () => {
    expect(await processFixture("duplicate-quote-occurrence-2.json")).toEqual([
      {
        id: "fix-1",
        ordinal: 1,
        kind: "mistake",
        quote: "enfant",
        span: { start: 59, end: 65 },
        anchor: "exact",
        category: "accord",
        question: null,
        explanation: "Le second enfant n'a pas de s.",
      },
    ]);
  });

  it("overlapping-quotes unanchors the second", async () => {
    expect(await processFixture("overlapping-quotes.json")).toEqual([
      {
        id: "fix-1",
        ordinal: 1,
        kind: "mistake",
        quote: "Les enfant jouent",
        span: { start: 28, end: 45 },
        anchor: "exact",
        category: "accord",
        question: null,
        explanation: "Premier empan.",
      },
      {
        id: "fix-2",
        ordinal: 2,
        kind: "mistake",
        quote: "enfant jouent",
        span: null,
        anchor: "none",
        category: "accord",
        question: null,
        explanation: "Deuxième empan chevauchant.",
      },
    ]);
  });

  it("unknown-category maps to autre after evaluate", async () => {
    expect(
      parseJson(EvaluatorOutputSchema, load("unknown-category.json")).ok,
    ).toBe(true);
    expect(await processFixture("unknown-category.json")).toEqual([
      {
        id: "fix-1",
        ordinal: 1,
        kind: "mistake",
        quote: "bayou",
        span: { start: 21, end: 26 },
        anchor: "exact",
        category: "autre",
        question: null,
        explanation: "Catégorie inventée.",
      },
    ]);
  });

  it("english-explanations still produce corrections", async () => {
    expect(await processFixture("english-explanations.json")).toEqual([
      {
        id: "fix-1",
        ordinal: 1,
        kind: "mistake",
        quote: "Les enfant",
        span: { start: 28, end: 38 },
        anchor: "exact",
        category: "accord",
        question: null,
        explanation: "Missing plural -s on the noun.",
      },
    ]);
  });

  it("invalid-json and missing-field raise AiOutputError", () => {
    expect(() => throughChatCompletionJSON(load("invalid-json.txt"))).toThrow(
      AiOutputError,
    );
    expect(() => throughChatCompletionJSON(load("missing-field.json"))).toThrow(
      AiOutputError,
    );
  });
});
