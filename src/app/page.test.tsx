import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Home page entry", () => {
  it("delegates to HomePage and does not import LevelCard", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/page.tsx"),
      "utf8",
    );
    expect(source).toContain("HomePage");
    expect(source).not.toMatch(/LevelCard/);
    expect(source).not.toMatch(/LegacyHome/);
  });
});
