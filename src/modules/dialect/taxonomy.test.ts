import { describe, expect, it } from "vitest";
import { MISTAKE_CATEGORY_IDS } from "@/contracts/mistake-category";
import { categoryTaxonomy } from "./taxonomy";

describe("categoryTaxonomy", () => {
  it("gives every category inlineName, shortName and elicitHint", () => {
    for (const id of MISTAKE_CATEGORY_IDS) {
      const row = categoryTaxonomy[id];
      expect(row.inlineName.length).toBeGreaterThan(0);
      expect(row.inlineName.charAt(0)).toBe(
        row.inlineName.charAt(0).toLowerCase(),
      );
      expect(row.shortName.length).toBeGreaterThan(0);
      expect(row.elicitHint.length).toBeGreaterThan(0);
      expect(row.elicitHint).not.toMatch(/subjonctif/i);
    }
  });

  it("uses the documented imparfait/PC elicit hint and ‑er / ‑é short name", () => {
    expect(categoryTaxonomy.imparfait_pc.elicitHint).toBe(
      "un récit au passé avec décor et événements",
    );
    expect(categoryTaxonomy.infinitif_participe.shortName).toBe(
      "\u2011er / \u2011é",
    );
    expect(categoryTaxonomy.infinitif_participe.inlineName).toBe(
      "infinitif ou participe (\u2011er / \u2011é)",
    );
  });
});
