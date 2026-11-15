import { describe, expect, it } from "vitest";
import { isProductionPath } from "./classify-path";

describe("isProductionPath", () => {
  const production: string[] = [
    "src/app/page.tsx",
    "eslint.config.mjs",
    ".github/workflows/check.yml",
    "scripts/pr-size.ts",
    "vitest.config.ts",
    "tooling/ast-grep/rules/foo.yml",
  ];

  const excluded: string[] = [
    "src/foo.test.ts",
    "src/foo.test.tsx",
    "src/test/setup-db.ts",
    "e2e/home.spec.ts",
    "src/test/fixtures/prompt.json",
    "src/app/fixtures/a.json",
    "fixtures/root.json",
    "__fixtures__/at-root.json",
    "pkg/__fixtures__/x.json",
    "tooling/ast-grep/tests/rule-test.yml",
    "docs/plan/board.md",
    "README.md",
    "drizzle/0000_init.sql",
    "next-env.d.ts",
    "src/data/seed.json",
    "package-lock.json",
  ];

  it.each(production)("counts %s as production", (filePath) => {
    expect(isProductionPath(filePath)).toBe(true);
  });

  it.each(excluded)("excludes %s", (filePath) => {
    expect(isProductionPath(filePath)).toBe(false);
  });
});
