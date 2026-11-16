import { describe, expect, it } from "vitest";
import { locateQuote } from "./locate-quote";

describe("locateQuote", () => {
  it("anchors the exact first quote", () => {
    const text = "Le chat. Le chien.";
    const found = locateQuote(text, "Le chat", 1, 0);
    expect(found).toEqual({ span: { start: 0, end: 7 }, anchor: "exact" });
    expect(text.slice(0, 7)).toBe("Le chat");
  });

  it("anchors the 2nd occurrence", () => {
    const text = "foo bar foo";
    const found = locateQuote(text, "foo", 2, 0);
    expect(found).toEqual({ span: { start: 8, end: 11 }, anchor: "exact" });
    expect(text.slice(8, 11)).toBe("foo");
  });

  it("falls back to the first match at or after cursor when the n-th is missing", () => {
    const text = "foo bar foo";
    const found = locateQuote(text, "foo", 3, 3);
    expect(found).toEqual({ span: { start: 8, end: 11 }, anchor: "exact" });
    expect(text.slice(8, 11)).toBe("foo");
  });

  it("matches curly vs straight apostrophe", () => {
    const text = "j'ai tombé";
    const found = locateQuote(text, "j\u2019ai", 1, 0);
    expect(found).toEqual({
      span: { start: 0, end: 4 },
      anchor: "normalized",
    });
    expect(text.slice(0, 4)).toBe("j'ai");
  });

  it("matches NBSP as a space", () => {
    const text = "les enfant";
    const found = locateQuote(text, "les\u00A0enfant", 1, 0);
    expect(found).toEqual({
      span: { start: 0, end: 10 },
      anchor: "normalized",
    });
    expect(text.slice(0, 10)).toBe("les enfant");
  });

  it("matches a case difference", () => {
    const text = "Bayou";
    const found = locateQuote(text, "BAYOU", 1, 0);
    expect(found).toEqual({
      span: { start: 0, end: 5 },
      anchor: "normalized",
    });
    expect(text.slice(0, 5)).toBe("Bayou");
  });

  it("retries after stripping trailing punctuation", () => {
    const text = "hello bayou today";
    const found = locateQuote(text, "bayou.", 1, 0);
    expect(found).toEqual({
      span: { start: 6, end: 11 },
      anchor: "normalized",
    });
    expect(text.slice(6, 11)).toBe("bayou");
  });

  it("returns null/none when the quote is not found", () => {
    expect(locateQuote("hello", "xyzzy", 1, 0)).toEqual({
      span: null,
      anchor: "none",
    });
  });

  it("uses UTF-16 indices so slice equals the matched source", () => {
    const text = "café 🙂";
    const found = locateQuote(text, "🙂", 1, 0);
    expect(found).toEqual({
      span: { start: 5, end: 7 },
      anchor: "exact",
    });
    expect(text.slice(5, 7)).toBe("🙂");
  });
});
