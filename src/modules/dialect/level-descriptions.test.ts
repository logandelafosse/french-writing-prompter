import { describe, expect, it } from "vitest";
import { LEVEL_DESCRIPTIONS } from "./level-descriptions";

const FORBIDDEN_AS_REQUIREMENT =
  /(including subjunctive|exige(?:r|nt|s)?\s+le\s+subjonctif|requires? (?:the )?subjunctive|passé simple exigé|futur simple exigé)/i;

describe("dialect-aware level descriptions", () => {
  it("B2 states the subjunctive is never required", () => {
    expect(LEVEL_DESCRIPTIONS.B2).toMatch(/subjonctif.*jamais exigé/i);
  });

  it("no level description requires subjunctive, passé simple, or futur simple", () => {
    for (const desc of Object.values(LEVEL_DESCRIPTIONS)) {
      expect(desc).not.toMatch(FORBIDDEN_AS_REQUIREMENT);
    }
    expect(LEVEL_DESCRIPTIONS.A1).not.toMatch(
      /subjonctif|passé simple|futur simple/i,
    );
    expect(LEVEL_DESCRIPTIONS.A2).not.toMatch(
      /subjonctif|passé simple|futur simple/i,
    );
    expect(LEVEL_DESCRIPTIONS.B1).not.toMatch(
      /subjonctif|passé simple|futur simple/i,
    );
  });
});
