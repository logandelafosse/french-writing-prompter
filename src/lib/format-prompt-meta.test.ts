import { describe, expect, it } from "vitest";
import type { PromptMeta } from "@/contracts/prompt-meta";
import { WORD_TARGET_BY_LEVEL } from "@/config/limits";
import { formatPromptMeta } from "./format-prompt-meta";

const mots = "mots";

const b1Familier: PromptMeta = {
  genre: "récit",
  tense: "passé composé et imparfait",
  tone: "",
  registre: "familier",
  wordTarget: { min: 250, max: 300 },
  topic: "famille",
  topicTags: ["famille"],
};

const a1: PromptMeta = {
  genre: "description",
  tense: "présent",
  tone: "",
  registre: "familier",
  wordTarget: { min: 10, max: 20 },
  topic: "maison",
  topicTags: [],
};

describe("formatPromptMeta", () => {
  it("joins genre, tense, range and registre with middots and an en dash", () => {
    const b1Range = `${WORD_TARGET_BY_LEVEL.B1.min}–${WORD_TARGET_BY_LEVEL.B1.max} ${mots}`;
    const a1Range = `${WORD_TARGET_BY_LEVEL.A1.min}–${WORD_TARGET_BY_LEVEL.A1.max} ${mots}`;
    expect(formatPromptMeta(b1Familier)).toBe(
      `récit · passé composé et imparfait · ${b1Range} · familier`,
    );
    expect(formatPromptMeta(a1)).toBe(
      `description · présent · ${a1Range} · familier`,
    );
  });
});
