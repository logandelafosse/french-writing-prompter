import { describe, expect, it } from "vitest";
import { formatEvaluationSummary } from "./review";

describe("formatEvaluationSummary", () => {
  it("evaluation summary pluralises and omits zero parts", () => {
    expect(
      formatEvaluationSummary([
        { kind: "mistake" },
        { kind: "mistake" },
        { kind: "mistake" },
        { kind: "standard" },
        { kind: "standard" },
        { kind: "dialect_check" },
      ]),
    ).toBe("3 fautes · 2 en français standard · 1 à vérifier");
    expect(formatEvaluationSummary([{ kind: "mistake" }])).toBe("1 faute");
    expect(
      formatEvaluationSummary([
        { kind: "mistake" },
        { kind: "mistake" },
        { kind: "dialect_check" },
      ]),
    ).toBe("2 fautes · 1 à vérifier");
    expect(formatEvaluationSummary([])).toBe("Aucune correction");
  });
});
