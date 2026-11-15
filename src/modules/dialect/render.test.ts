import { describe, expect, it } from "vitest";
import { renderForEvaluator, renderForGenerator } from "./render";

const EVALUATOR_EXAMPLES = [
  "ils mangeont",
  "vous",
  "faut que tu viens",
  "faut que tu sois",
  "est-ce que",
  "ils étiont",
  "ils onvaiont",
  "ils auriont eu",
];

describe("dialect renderers", () => {
  it("renderForGenerator includes every approved rule", () => {
    const text = renderForGenerator();
    expect(text).toContain("eux-autres");
    expect(text).toContain("nous-autres");
    expect(text).toContain("être après");
    expect(text).not.toMatch(/\b(nous|vous|eux)-autre\b/);
  });

  it("renderForEvaluator lists required examples as correct", () => {
    const text = renderForEvaluator();
    for (const example of EVALUATOR_EXAMPLES) {
      expect(text).toContain(example);
    }
    expect(text).toContain("eux-autres");
    expect(text).not.toMatch(/\bchaoui\b|\bmaringouin\b|\bchar\b/);
  });
});
