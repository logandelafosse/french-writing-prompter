import { describe, expect, it } from "vitest";
import { findFrenchTypographyIssues } from "./scan-strings";
import { scanFrenchTypography } from "./check-french-typography";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../../src");

describe("typography check", () => {
  it("flags regular space before question mark", () => {
    const issues = findFrenchTypographyIssues(
      'export const s = "Ça se dit comme ça ?";',
    );
    expect(issues).toEqual([expect.objectContaining({ punct: "?", line: 1 })]);
  });

  it("accepts U+202F before punctuation and after «", () => {
    const issues = findFrenchTypographyIssues(
      'export const s = "Ça se dit comme ça\\u202F? «\\u202Fici\\u202F»";',
    );
    expect(issues).toEqual([]);
  });

  it("ignores ternary question marks in code", () => {
    expect(findFrenchTypographyIssues("const n = ok ? 1 : 0;")).toEqual([]);
  });

  it("ignores SQL bind placeholders", () => {
    expect(
      findFrenchTypographyIssues(
        "const sql = `UPDATE sessions SET status = ?, local_date = ? WHERE id = ?`;",
      ),
    ).toEqual([]);
  });

  it("passes on src/", () => {
    expect(scanFrenchTypography(SRC)).toEqual([]);
  });
});
