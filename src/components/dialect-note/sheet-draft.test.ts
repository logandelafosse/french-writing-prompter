import { describe, expect, it } from "vitest";
import { containingSentence, dialectSheetDraft } from "./sheet-draft";

const writing = "Mon petit cousin a tombé dans la boue. Les enfant jouent.";
const quote = "a tombé";
const start = writing.indexOf(quote);

describe("dialectSheetDraft", () => {
  it("uses the quote and containing sentence when the model fields are null", () => {
    const draft = dialectSheetDraft(
      {
        quote,
        span: { start, end: start + quote.length },
        ruleIfDialect: "On dit a tombé.",
        dialectLemma: null,
        dialectExample: null,
        dialectPattern: null,
      },
      writing,
    );
    expect(draft.lemma).toBe("a tombé");
    expect(draft.example).toBe("Mon petit cousin a tombé dans la boue.");
    expect(draft.pattern).toBeNull();
    expect(draft.rule).toBe("On dit a tombé.");
  });

  it("keeps model lemma, example, and pattern when they are present", () => {
    const draft = dialectSheetDraft(
      {
        quote,
        span: { start, end: start + quote.length },
        ruleIfDialect: "On dit a tombé.",
        dialectLemma: "tomber",
        dialectExample: "Il a tombé hier.",
        dialectPattern: "«\u202Favoir\u202F» avec les verbes de mouvement",
      },
      writing,
    );
    expect(draft.lemma).toBe("tomber");
    expect(draft.example).toBe("Il a tombé hier.");
    expect(draft.pattern).toBe(
      "«\u202Favoir\u202F» avec les verbes de mouvement",
    );
  });
});

describe("containingSentence", () => {
  it("returns the quote when it is not in the text", () => {
    expect(containingSentence("Rien ici.", quote, null)).toBe(quote);
  });
});
