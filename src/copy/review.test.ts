import { describe, expect, it } from "vitest";
import { formatEvaluationSummary } from "./review";

describe("formatEvaluationSummary", () => {
  it("evaluation summary pluralises and omits zero parts", () => {
    expect(
      formatEvaluationSummary([
        { kind: "mistake", status: "open" },
        { kind: "mistake", status: "open" },
        { kind: "mistake", status: "open" },
        { kind: "standard", status: "open" },
        { kind: "standard", status: "open" },
        { kind: "dialect_check", status: "open" },
      ]),
    ).toBe("3 fautes · 2 en français standard · 1 à vérifier");
    expect(formatEvaluationSummary([{ kind: "mistake", status: "open" }])).toBe(
      "1 faute",
    );
    expect(
      formatEvaluationSummary([
        { kind: "mistake", status: "open" },
        { kind: "mistake", status: "open" },
        { kind: "dialect_check", status: "open" },
      ]),
    ).toBe("2 fautes · 1 à vérifier");
    expect(formatEvaluationSummary([])).toBe("Aucune correction");
  });

  it("counts a confirmed dialect check as a faute and drops resolved notes", () => {
    expect(
      formatEvaluationSummary([
        { kind: "dialect_check", status: "confirmed_mistake" },
      ]),
    ).toBe("1 faute");
    expect(
      formatEvaluationSummary([
        { kind: "dialect_check", status: "confirmed_dialect" },
        { kind: "mistake", status: "overturned" },
      ]),
    ).toBe("Aucune correction");
  });
});
