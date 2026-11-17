import { describe, expect, it, vi } from "vitest";
import {
  EvaluatorOutputSchema,
  type EvaluatorOutputDraft,
} from "@/contracts/evaluation";
import path from "node:path";
import { countsAsMistake } from "@/contracts/correction";
import type { LearnerDialectNote } from "@/contracts/dialect-note";
import type { MistakeCategory } from "@/contracts/mistake-category";
import { loadDlfLexicon } from "@/modules/dlf/load";
import { emptyDlfIndex, type DlfIndex } from "@/modules/dlf/lookup";
import { resourcesFor } from "@/modules/resources/catalog";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import type { WritingPrompt } from "@/modules/prompt-generator/prompt-generator";
import { parseJson } from "@/lib/json";
import { dialectCheckQuestion } from "./post-process";
import { WritingEvaluator, type OpenAiClientLike } from "./writing-evaluator";
import okMixedKinds from "./__fixtures__/ok-mixed-kinds.json";

const dlfIndex = loadDlfLexicon(
  path.join(process.cwd(), "src/test/fixtures/dlf/lexicon.json"),
);

const writing =
  "Maintenant je vas au bayou. Les enfant jouent. J'ai vu les enfant près du pont.";

function ids() {
  let n = 0;
  return () => `id-${++n}`;
}

function now() {
  return new Date("2026-11-16T18:00:00.000Z");
}

function baseOutput(
  corrections: EvaluatorOutputDraft["corrections"],
): EvaluatorOutputDraft {
  return {
    dimensions: {
      grammatical_accuracy: { score: 4, comment: "ok" },
      vocabulary: { score: 3, comment: "ok" },
      coherence: { score: 4, comment: "ok" },
      register_style: { score: 3, comment: "ok" },
    },
    overall_cefr: "B1",
    summary: "Résumé.",
    next_level_tip: "Pour atteindre B2, continue.",
    corrections,
  };
}

function correction(
  partial: Partial<EvaluatorOutputDraft["corrections"][number]> & {
    kind: EvaluatorOutputDraft["corrections"][number]["kind"];
    quote: string;
  },
): EvaluatorOutputDraft["corrections"][number] {
  return {
    occurrence: 1,
    suggestion: "x",
    explanation: "e",
    category: "accord",
    question: null,
    rule_if_dialect: "r",
    dlf_headword: null,
    resource_ids: [],
    context_quote: null,
    dialect_example: null,
    dialect_lemma: null,
    dialect_pattern: null,
    ...partial,
  };
}

const prompt: WritingPrompt = {
  text: "Décrivez votre ville natale en 100 mots.",
  constraints: { cefrLevel: "B1", dialect: DEFAULT_DIALECT },
};

async function evaluate(
  raw: EvaluatorOutputDraft,
  ctx: {
    text: string;
    sessionId: number;
    now: () => Date;
    createId: () => string;
    lookupDlf?: DlfIndex["lookup"];
    dialectNotes?: readonly LearnerDialectNote[];
    focusCategories?: readonly MistakeCategory[];
  },
) {
  const client: OpenAiClientLike = {
    chatCompletionJSON: vi.fn().mockResolvedValue(raw),
  };
  const dlf: DlfIndex = ctx.lookupDlf
    ? { lookup: ctx.lookupDlf, cardsForText: () => [] }
    : emptyDlfIndex();
  return new WritingEvaluator(client).evaluate(
    ctx.text,
    prompt,
    {
      dialect: DEFAULT_DIALECT,
      dlf,
      ...(ctx.dialectNotes !== undefined ? { notes: ctx.dialectNotes } : {}),
    },
    {
      sessionId: ctx.sessionId,
      now: ctx.now,
      createId: ctx.createId,
      ...(ctx.focusCategories !== undefined
        ? { focusCategories: ctx.focusCategories }
        : {}),
    },
  );
}

describe("evaluate", () => {
  it("returns corrections with spans for mixed kinds", async () => {
    const parsed = parseJson(
      EvaluatorOutputSchema,
      JSON.stringify(okMixedKinds),
    );
    if (!parsed.ok) throw new Error(String(parsed.cause));
    const result = await evaluate(parsed.value, {
      text: writing,
      sessionId: 1,
      now,
      createId: ids(),
    });
    expect(
      result.corrections.map((item) => ({
        kind: item.kind,
        quote: item.quote,
        span: item.span,
      })),
    ).toEqual([
      { kind: "standard", quote: "Maintenant", span: { start: 0, end: 10 } },
      { kind: "dialect_check", quote: "je vas", span: { start: 11, end: 17 } },
      { kind: "mistake", quote: "Les enfant", span: { start: 28, end: 38 } },
    ]);
  });

  it("drops an empty quote", async () => {
    const result = await evaluate(
      baseOutput([
        correction({ kind: "mistake", quote: "", suggestion: "y" }),
        correction({
          kind: "mistake",
          quote: "Les enfant",
          suggestion: "Les enfants",
        }),
      ]),
      { text: writing, sessionId: 1, now, createId: ids() },
    );
    expect(result.corrections.map((item) => item.quote)).toEqual([
      "Les enfant",
    ]);
  });

  it("keeps unlocatable corrections unmarked", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "mistake",
          quote: "xyzzy-not-in-text",
          suggestion: "y",
        }),
      ]),
      { text: writing, sessionId: 1, now, createId: ids() },
    );
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0]?.span).toBeNull();
    expect(result.corrections[0]?.anchor).toBe("none");
  });

  it("keeps an overlapping second quote with span null", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "mistake",
          quote: "Les enfant jouent",
          suggestion: "Les enfants jouent",
        }),
        correction({
          kind: "mistake",
          quote: "enfant jouent",
          suggestion: "enfants jouent",
        }),
      ]),
      { text: writing, sessionId: 1, now, createId: ids() },
    );
    expect(result.corrections).toHaveLength(2);
    expect(result.corrections[0]?.span).toEqual({ start: 28, end: 45 });
    expect(result.corrections[1]?.span).toBeNull();
    expect(result.corrections[1]?.anchor).toBe("none");
  });

  it("enforces kind invariants", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "standard",
          quote: "Maintenant",
          suggestion: "Asteur",
          category: "vocabulaire",
          resource_ids: ["invented"],
        }),
        correction({
          kind: "mistake",
          quote: "bayou",
          suggestion: "bayou",
          category: "not_a_real_category",
        }),
        correction({
          kind: "dialect_check",
          quote: "je vas",
          suggestion: "je vais",
          category: "conjugaison",
          question: null,
        }),
        correction({
          kind: "standard",
          quote: "bayou",
          suggestion: "bayou",
        }),
      ]),
      { text: writing, sessionId: 1, now, createId: ids() },
    );
    expect(result.corrections).toHaveLength(3);
    const standard = result.corrections.find((c) => c.kind === "standard");
    const unknown = result.corrections.find((c) => c.quote === "bayou");
    const check = result.corrections.find((c) => c.kind === "dialect_check");
    expect(standard?.category).toBeNull();
    expect(standard?.resourceIds).toEqual([]);
    expect(unknown?.category).toBe("autre");
    expect(check?.question).toBe(dialectCheckQuestion("je vas"));
  });

  it("keeps a non-empty dialect_check question from the model", async () => {
    const asked = "C'est voulu, ça\u202F?";
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "dialect_check",
          quote: "je vas",
          suggestion: "je vais",
          category: "conjugaison",
          question: asked,
        }),
      ]),
      { text: writing, sessionId: 1, now, createId: ids() },
    );
    expect(result.corrections[0]?.question).toBe(asked);
    expect(result.corrections[0]?.question).not.toBe(
      dialectCheckQuestion("je vas"),
    );
  });

  it("sets dlf on an attested standard suggestion", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "standard",
          quote: "Maintenant",
          suggestion: "Asteur",
          dlf_headword: "asteur",
        }),
      ]),
      {
        text: writing,
        sessionId: 1,
        now,
        createId: ids(),
        lookupDlf: (word) => dlfIndex.lookup(word),
      },
    );
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0]?.kind).toBe("standard");
    expect(result.corrections[0]?.dlf).toEqual({
      entryId: "asteur-0a4c0152c15a",
      headword: "asteur",
    });
  });

  it("does not set dlf when the suggestion misses and only dlf_headword is attested", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "standard",
          quote: "Maintenant",
          suggestion: "mon char",
          dlf_headword: "asteur",
        }),
      ]),
      {
        text: writing,
        sessionId: 1,
        now,
        createId: ids(),
        lookupDlf: (word) => dlfIndex.lookup(word),
      },
    );
    const item = result.corrections[0];
    expect(item?.kind).toBe("standard");
    expect(item?.suggestion).toBe("mon char");
    expect(item?.dlf).toBeNull();
  });

  it("keeps an unattested standard Correction with dlf null and does not make a Mistake", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "standard",
          quote: "Maintenant",
          suggestion: "mon char",
          dlf_headword: "char",
        }),
      ]),
      {
        text: writing,
        sessionId: 1,
        now,
        createId: ids(),
        lookupDlf: (word) => dlfIndex.lookup(word),
      },
    );
    const item = result.corrections[0];
    expect(item?.kind).toBe("standard");
    expect(item?.suggestion).toBe("mon char");
    expect(item?.dlf).toBeNull();
    expect(item ? countsAsMistake(item) : true).toBe(false);
  });

  it("fills lemma from the quote and example from the containing sentence when the model leaves them null", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "mistake",
          quote: "Les enfant",
          suggestion: "Les enfants",
          context_quote: null,
          dialect_example: null,
          dialect_lemma: null,
          dialect_pattern: null,
        }),
      ]),
      { text: writing, sessionId: 1, now, createId: ids() },
    );
    const item = result.corrections[0];
    expect(item?.dialectLemma).toBe("Les enfant");
    expect(item?.dialectExample).toBe("Les enfant jouent.");
    expect(item?.contextQuote).toBe("Les enfant");
    expect(item?.dialectPattern).toBeNull();
  });

  it("keeps model-provided dialect fields and hides no pattern when one is given", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "dialect_check",
          quote: "je vas",
          suggestion: "je vais",
          context_quote: "Maintenant je vas",
          dialect_example: "je vas au bayou",
          dialect_lemma: "aller",
          dialect_pattern: "aller au présent",
        }),
      ]),
      { text: writing, sessionId: 1, now, createId: ids() },
    );
    const item = result.corrections[0];
    expect(item?.contextQuote).toBe("Maintenant je vas");
    expect(item?.dialectExample).toBe("je vas au bayou");
    expect(item?.dialectLemma).toBe("aller");
    expect(item?.dialectPattern).toBe("aller au présent");
  });

  it("drops a mistake whose quote matches an active word-scope note", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "mistake",
          quote: "a tombé",
          suggestion: "est tombé",
        }),
        correction({
          kind: "mistake",
          quote: "Les enfant",
          suggestion: "Les enfants",
        }),
      ]),
      {
        text: "Il a tombé hier. Les enfant jouent.",
        sessionId: 1,
        now,
        createId: ids(),
        dialectNotes: [
          {
            scope: "word",
            form: "tomber",
            learnerForm: "a tombé",
            rule: "On dit a tombé.",
            deletedAt: null,
          },
        ],
      },
    );
    expect(result.corrections.map((c) => c.quote)).toEqual(["Les enfant"]);
  });

  it("drops a mistake whose quote matches the note form when learnerForm differs", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "mistake",
          quote: "a tombé",
          suggestion: "est tombé",
        }),
      ]),
      {
        text: "Il a tombé hier.",
        sessionId: 1,
        now,
        createId: ids(),
        dialectNotes: [
          {
            scope: "word",
            form: "a tombé",
            learnerForm: "tomber",
            rule: "On dit a tombé.",
            deletedAt: null,
          },
        ],
      },
    );
    expect(result.corrections).toHaveLength(0);
  });

  it("keeps the mistake when the matching word-scope note is soft-deleted", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "mistake",
          quote: "a tombé",
          suggestion: "est tombé",
        }),
      ]),
      {
        text: "Il a tombé hier.",
        sessionId: 1,
        now,
        createId: ids(),
        dialectNotes: [
          {
            scope: "word",
            form: "a tombé",
            learnerForm: "a tombé",
            rule: "On dit a tombé.",
            deletedAt: "2026-11-01T00:00:00.000Z",
          },
        ],
      },
    );
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0]?.quote).toBe("a tombé");
  });

  it("sets isFocus only on Mistakes whose category is in the session snapshot", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "mistake",
          quote: "Les enfant",
          suggestion: "Les enfants",
          category: "accord",
        }),
        correction({
          kind: "mistake",
          quote: "je vas",
          suggestion: "je vais",
          category: "conjugaison",
        }),
        correction({
          kind: "standard",
          quote: "Maintenant",
          suggestion: "Asteur",
          category: null,
        }),
      ]),
      {
        text: writing,
        sessionId: 1,
        now,
        createId: ids(),
        focusCategories: ["accord"],
      },
    );
    expect(result.corrections).toHaveLength(3);
    expect(
      result.corrections.find((row) => row.category === "accord")?.isFocus,
    ).toBe(true);
    expect(
      result.corrections.find((row) => row.category === "conjugaison")?.isFocus,
    ).toBe(false);
    expect(
      result.corrections.find((row) => row.kind === "standard")?.isFocus,
    ).toBe(false);
  });

  it("drops invented and other-category resource ids then fills category defaults", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "mistake",
          quote: "Les enfant",
          suggestion: "Les enfants",
          category: "accord",
          resource_ids: ["invented-resource", "grammaire-genre"],
        }),
      ]),
      { text: writing, sessionId: 1, now, createId: ids() },
    );
    const item = result.corrections[0];
    expect(item?.kind).toBe("mistake");
    expect(item?.resourceIds).not.toContain("invented-resource");
    expect(item?.resourceIds).not.toContain("grammaire-genre");
    expect(item?.resourceIds).toEqual(
      resourcesFor("accord", []).map((link) => link.id),
    );
    expect(item?.resources.map((link) => link.type)).toEqual([
      "grammaire",
      "input",
    ]);
  });

  it("leaves resourceIds empty on standard and open dialect_check", async () => {
    const result = await evaluate(
      baseOutput([
        correction({
          kind: "standard",
          quote: "Maintenant",
          suggestion: "Asteur",
          resource_ids: ["grammaire-accord"],
        }),
        correction({
          kind: "dialect_check",
          quote: "je vas",
          suggestion: "je vais",
          category: "conjugaison",
          resource_ids: ["grammaire-conjugaison"],
        }),
      ]),
      { text: writing, sessionId: 1, now, createId: ids() },
    );
    const standard = result.corrections.find((c) => c.kind === "standard");
    const check = result.corrections.find((c) => c.kind === "dialect_check");
    expect(standard?.resourceIds).toEqual([]);
    expect(standard?.resources).toEqual([]);
    expect(check?.resourceIds).toEqual([]);
    expect(check?.resources).toEqual([]);
  });
});
