import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadDlfLexicon } from "./load";
import { dlfIndexFromText, emptyDlfIndex } from "./lookup";

const FIXTURE = path.join(process.cwd(), "src/test/fixtures/dlf/lexicon.json");

describe("DLF lookup", () => {
  const index = loadDlfLexicon(FIXTURE);

  it("loads the fixture and finds an exact headword", () => {
    const hit = index.lookup("asteur");
    expect(hit).toEqual({
      entryId: "asteur-0a4c0152c15a",
      headword: "asteur",
      accentMismatch: false,
    });
  });

  it("matches a listed form and a plural-stripped spelling", () => {
    expect(index.lookup("icitte")?.headword).toBe("ici");
    expect(index.lookup("Asteur")?.headword).toBe("asteur");
    const plural = index.lookup("chevrettes");
    expect(plural?.headword).toBe("chevrette");
    expect(plural?.accentMismatch).toBe(false);
  });

  it("accent-folds when exact and plural miss", () => {
    const hit = index.lookup("ecrevisse");
    expect(hit?.headword).toBe("écrevisse");
    expect(hit?.accentMismatch).toBe(true);
  });

  it("returns empty lookups when the lexicon file is missing, without throwing", () => {
    expect(() => loadDlfLexicon("/no/such/dlf-lexicon.json")).not.toThrow();
    expect(
      loadDlfLexicon("/no/such/dlf-lexicon.json").lookup("asteur"),
    ).toBeNull();
    expect(emptyDlfIndex().lookup("asteur")).toBeNull();
    expect(dlfIndexFromText("not-json").lookup("asteur")).toBeNull();
  });
});
