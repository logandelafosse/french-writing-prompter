import { describe, expect, it } from "vitest";
import { MISTAKE_CATEGORY_IDS } from "@/contracts/mistake-category";
import { Resource } from "@/contracts/resource";
import { catalog, resourcesFor } from "./catalog";

describe("resource catalog", () => {
  it("parses every entry, ids are unique, every category has both types, total under 60", () => {
    const ids = new Set<string>();
    for (const entry of catalog) {
      expect(Resource.parse(entry)).toEqual(entry);
      expect(ids.has(entry.id)).toBe(false);
      ids.add(entry.id);
    }
    expect(catalog.length).toBeLessThan(60);
    for (const category of MISTAKE_CATEGORY_IDS) {
      expect(
        catalog.some(
          (entry) =>
            entry.type === "grammaire" && entry.categories.includes(category),
        ),
      ).toBe(true);
      expect(
        catalog.some(
          (entry) =>
            entry.type === "input" && entry.categories.includes(category),
        ),
      ).toBe(true);
    }
  });

  it("resourcesFor returns category defaults when stored ids are empty", () => {
    const links = resourcesFor("accord", []);
    expect(links.map((link) => link.type)).toEqual(["grammaire", "input"]);
    expect(links[0]).toMatchObject({
      id: "grammaire-accord",
      type: "grammaire",
    });
    expect(links[0]?.url).toMatch(/^https:\/\//);
    expect(links[1]?.url).toMatch(/^https:\/\//);
    expect(links[1]?.id).not.toBe("grammaire-accord");
  });
});
