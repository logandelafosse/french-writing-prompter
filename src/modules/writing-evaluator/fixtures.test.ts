import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AiOutputError } from "@/modules/openai-client/ai-output-error";
import { parseJson } from "@/lib/json";
import { z } from "zod";
import { EVALUATOR_CORRECTIONS_MAX } from "@/config/limits";
import { CorrectionKind } from "@/contracts/correction";
import {
  EvaluatorOutputSchema,
  type EvaluatorOutputDraft,
} from "@/contracts/evaluation";
import { dialectCheckQuestion, postProcessEvaluation } from "./post-process";

const DIR = path.join(import.meta.dirname, "__fixtures__");
const writing =
  "Maintenant je vas au bayou. Les enfant jouent. J'ai vu les enfant près du pont.";

function load(name: string): string {
  return fs.readFileSync(path.join(DIR, name), "utf8");
}

const FixtureOutputSchema = EvaluatorOutputSchema.extend({
  corrections: z
    .array(
      z.strictObject({
        kind: CorrectionKind,
        quote: z.string(),
        occurrence: z.number().int(),
        suggestion: z.string(),
        explanation: z.string(),
        category: z.string().nullable(),
        question: z.string().nullable(),
        rule_if_dialect: z.string().nullable(),
        dlf_headword: z.string().nullable(),
        resource_ids: z.array(z.string()),
      }),
    )
    .max(EVALUATOR_CORRECTIONS_MAX),
});

function throughChatCompletionJSON(text: string): EvaluatorOutputDraft {
  const strict = parseJson(EvaluatorOutputSchema, text);
  if (strict.ok) return strict.value;
  const fixture = parseJson(FixtureOutputSchema, text);
  if (fixture.ok) return fixture.value;
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

function processFixture(name: string) {
  const raw = throughChatCompletionJSON(load(name));
  return postProcessEvaluation(raw, {
    text: writing,
    sessionId: 7,
    now: () => new Date("2026-11-16T18:00:00.000Z"),
    createId: (() => {
      let n = 0;
      return () => `fix-${++n}`;
    })(),
  }).corrections.map((c) => ({
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
  it("ok-mixed-kinds produces stable corrections", () => {
    expect(processFixture("ok-mixed-kinds.json")).toEqual([
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
        question: dialectCheckQuestion("je vas"),
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

  it("quote-not-found stays unanchored", () => {
    expect(processFixture("quote-not-found.json")).toEqual([
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

  it("quote-wrong-case-curly-apostrophe normalizes", () => {
    expect(processFixture("quote-wrong-case-curly-apostrophe.json")).toEqual([
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

  it("duplicate-quote-occurrence-2 hits the second enfant", () => {
    expect(processFixture("duplicate-quote-occurrence-2.json")).toEqual([
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

  it("overlapping-quotes unanchors the second", () => {
    expect(processFixture("overlapping-quotes.json")).toEqual([
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

  it("unknown-category maps to autre after the LLM schema rejects the invented ID", () => {
    const text = load("unknown-category.json");
    expect(parseJson(EvaluatorOutputSchema, text).ok).toBe(false);
    expect(processFixture("unknown-category.json")).toEqual([
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

  it("english-explanations still produce corrections", () => {
    expect(processFixture("english-explanations.json")).toEqual([
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
