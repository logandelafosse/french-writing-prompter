import { describe, expect, it } from "vitest";
import { type EvaluatorOutputDraft } from "@/contracts/evaluation";
import { dialectCheckQuestion, postProcessEvaluation } from "./post-process";

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
    ...partial,
  };
}

describe("postProcessEvaluation", () => {
  it("keeps unlocatable corrections unmarked", () => {
    const result = postProcessEvaluation(
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

  it("keeps an overlapping second quote with span null", () => {
    const result = postProcessEvaluation(
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

  it("enforces kind invariants", () => {
    const result = postProcessEvaluation(
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
});
