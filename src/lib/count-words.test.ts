import { describe, expect, it } from "vitest";
import { countWords } from "./count-words";
describe("countWords", () => {
  it("handles elisions, hyphens and whitespace", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("l'école")).toBe(1);
    expect(countWords("bien-aimé")).toBe(1);
    expect(countWords("a  b\tc")).toBe(3);
  });
});
