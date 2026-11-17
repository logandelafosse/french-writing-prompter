import { describe, expect, it } from "vitest";
import type { DialectMarkdownNote } from "./export-markdown";
import { renderDialectMarkdown } from "./export-markdown";
import type { LouisianaRule } from "./louisiana-rules";

const HEADER =
  "GÉNÉRÉ — modifier dans l'app (notes) ou dans src/modules/dialect/louisiana-rules.ts (règles de base)";

const CHICAGO = "America/Chicago";

const BASE_RULE: LouisianaRule = {
  id: "progressive",
  rule_fr: "Progressif\u202F: être après + infinitif.",
  rule_en: "Present progressive: être après + infinitive.",
  examples: ["je suis après manger"],
  neverFlag: true,
};

function note(
  partial: Pick<DialectMarkdownNote, "id" | "scope" | "rule"> &
    Partial<DialectMarkdownNote>,
): DialectMarkdownNote {
  return {
    example: "Un exemple.",
    form: "form",
    learnerForm: "apprenant",
    tutorSuggestion: "tuteur",
    sourceSessionId: null,
    sourceCorrectionId: null,
    createdAt: "2026-11-16T18:00:00.000Z",
    updatedAt: "2026-11-16T18:00:00.000Z",
    deletedAt: null,
    ...partial,
  };
}

describe("renderDialectMarkdown", () => {
  it("starts with the GÉNÉRÉ header, then base rules, word notes, pattern notes", () => {
    const markdown = renderDialectMarkdown(
      [BASE_RULE],
      [
        note({
          id: 2,
          scope: "pattern",
          rule: "Toute la famille: avoir.",
          form: "avoir",
        }),
        note({
          id: 1,
          scope: "word",
          rule: "Ce mot: asteur.",
          form: "asteur",
        }),
      ],
      CHICAGO,
    );

    expect(markdown.startsWith(HEADER)).toBe(true);
    expect(markdown.indexOf(HEADER)).toBeLessThan(
      markdown.indexOf(BASE_RULE.rule_fr),
    );
    expect(markdown.indexOf(BASE_RULE.rule_fr)).toBeLessThan(
      markdown.indexOf("Ce mot seulement"),
    );
    expect(markdown.indexOf("Ce mot seulement")).toBeLessThan(
      markdown.indexOf("Ce mot: asteur."),
    );
    expect(markdown.indexOf("Ce mot: asteur.")).toBeLessThan(
      markdown.indexOf("Toute la famille"),
    );
    expect(markdown.indexOf("Toute la famille")).toBeLessThan(
      markdown.indexOf("Toute la famille: avoir."),
    );
  });

  it("excludes notes with deletedAt set", () => {
    const markdown = renderDialectMarkdown(
      [BASE_RULE],
      [
        note({ id: 1, scope: "word", rule: "Active note." }),
        note({
          id: 2,
          scope: "word",
          rule: "Deleted note.",
          deletedAt: "2026-11-16T19:00:00.000Z",
        }),
      ],
      CHICAGO,
    );

    expect(markdown).toContain("Active note.");
    expect(markdown).not.toContain("Deleted note.");
  });

  it("is byte-identical for the same notes regardless of input order", () => {
    const a = note({ id: 3, scope: "pattern", rule: "Pattern C." });
    const b = note({ id: 1, scope: "word", rule: "Word A." });
    const c = note({ id: 2, scope: "word", rule: "Word B." });

    const first = renderDialectMarkdown([BASE_RULE], [a, b, c], CHICAGO);
    const second = renderDialectMarkdown([BASE_RULE], [c, a, b], CHICAGO);

    expect(first).toBe(second);
    expect(renderDialectMarkdown([BASE_RULE], [a, b, c], CHICAGO)).toBe(first);
  });

  it("omits the comparison line when learnerForm or tutorSuggestion is missing", () => {
    const withPair = renderDialectMarkdown(
      [BASE_RULE],
      [
        note({
          id: 1,
          scope: "word",
          rule: "With pair.",
          learnerForm: "icitte",
          tutorSuggestion: "ici",
        }),
      ],
      CHICAGO,
    );
    const manual = renderDialectMarkdown(
      [BASE_RULE],
      [
        note({
          id: 2,
          scope: "word",
          rule: "Manual note.",
          learnerForm: null,
          tutorSuggestion: null,
        }),
      ],
      CHICAGO,
    );

    expect(withPair).toContain("icitte → ici");
    expect(manual).toContain("Manual note.");
    expect(manual).not.toContain("→");
  });

  it("renders the source date line in the given timezone", () => {
    const createdAt = "2026-11-16T04:00:00.000Z";
    const dated = note({
      id: 1,
      scope: "word",
      rule: "Date line.",
      createdAt,
    });

    const chicago = renderDialectMarkdown([BASE_RULE], [dated], CHICAGO);
    const utc = renderDialectMarkdown([BASE_RULE], [dated], "UTC");

    expect(chicago).toContain("2026-11-15");
    expect(utc).toContain("2026-11-16");
    expect(chicago).not.toContain("2026-11-16");
  });
});
