import { describe, expect, it } from "vitest";
import { parseNumstatAddedLines, totalAddedLines } from "./parse-numstat";

describe("parseNumstatAddedLines", () => {
  it("counts only added production lines and ignores deletions-only paths", () => {
    const output = [
      "10\t0\tsrc/app/page.tsx",
      "0\t5\tsrc/legacy.ts",
      "1000\t0\tsrc/foo.test.ts",
      "3\t0\tREADME.md",
    ].join("\n");

    const byFile = parseNumstatAddedLines(output);
    expect(byFile.get("src/app/page.tsx")).toBe(10);
    expect(byFile.has("src/foo.test.ts")).toBe(false);
    expect(totalAddedLines(byFile)).toBe(10);
  });
});