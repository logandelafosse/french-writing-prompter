import { readFile } from "node:fs/promises";
import { ESLint, type Linter } from "eslint";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../..");

function createEslint() {
  return new ESLint({
    cwd: root,
    overrideConfigFile: path.join(root, "eslint.config.mjs"),
    ignore: false,
  });
}

async function lintFixtureFile(relativePath: string) {
  const filePath = path.join(root, relativePath);
  const eslint = createEslint();
  const results = await eslint.lintFiles([filePath]);
  return results[0]?.messages ?? [];
}

async function lintFixtureAs(
  relativeFixture: string,
  virtualRelativePath: string,
) {
  const code = await readFile(path.join(root, relativeFixture), "utf8");
  const eslint = createEslint();
  const filePath = path.join(root, virtualRelativePath);
  const results = await eslint.lintText(code, { filePath });
  return results[0]?.messages ?? [];
}

function ruleIds(messages: Linter.LintMessage[]): string[] {
  const ids: string[] = [];
  for (const message of messages) {
    if (typeof message.ruleId === "string") {
      ids.push(message.ruleId);
    }
  }
  return ids;
}

describe("eslint.config.mjs guardrails", { timeout: 60_000 }, () => {
  it("blocks DLF lexicon loader import from component layer", async () => {
    const messages = await lintFixtureAs(
      "src/test/lint-fixtures/components/home/dlf-import.tsx",
      "src/components/home/__lint-fixtures__/dlf-import.tsx",
    );
    expect(ruleIds(messages)).toContain(
      "@typescript-eslint/no-restricted-imports",
    );
  });

  it("blocks @/db import from component layer", async () => {
    const messages = await lintFixtureAs(
      "src/test/lint-fixtures/components/home/db-import.tsx",
      "src/components/home/__lint-fixtures__/db-import.tsx",
    );
    expect(ruleIds(messages)).toContain(
      "@typescript-eslint/no-restricted-imports",
    );
  });

  it("blocks react import from domain modules", async () => {
    const messages = await lintFixtureAs(
      "src/test/lint-fixtures/modules/react-import.ts",
      "src/modules/lint-probe/react-import.ts",
    );
    expect(ruleIds(messages)).toContain(
      "@typescript-eslint/no-restricted-imports",
    );
  });

  it("blocks openai import outside openai-client", async () => {
    const messages = await lintFixtureAs(
      "src/test/lint-fixtures/modules/openai-outside-client.ts",
      "src/modules/lint-probe/openai-outside-client.ts",
    );
    expect(ruleIds(messages)).toContain(
      "@typescript-eslint/no-restricted-imports",
    );
  });

  it("requires -- reason on eslint-disable-next-line", async () => {
    const messages = await lintFixtureFile(
      "src/test/lint-fixtures/misc/disable-without-reason.ts",
    );
    expect(ruleIds(messages)).toContain(
      "@eslint-community/eslint-comments/require-description",
    );
  });

  it("fails switch-exhaustiveness-check when default hides a union member", async () => {
    const messages = await lintFixtureFile(
      "src/test/lint-fixtures/misc/non-exhaustive-switch.ts",
    );
    expect(ruleIds(messages)).toContain(
      "@typescript-eslint/switch-exhaustiveness-check",
    );
  });

  it("fails no-misused-promises on async onClick", async () => {
    const messages = await lintFixtureAs(
      "src/test/lint-fixtures/components/home/async-onclick.tsx",
      "src/components/home/__lint-fixtures__/async-onclick.tsx",
    );
    expect(ruleIds(messages)).toContain(
      "@typescript-eslint/no-misused-promises",
    );
  });

  it("fails vitest/no-focused-tests on it.only", async () => {
    const messages = await lintFixtureAs(
      "src/test/lint-fixtures/misc/vitest-focused-snippet.ts",
      "src/modules/lint-probe/focused.test.ts",
    );
    expect(ruleIds(messages)).toContain("vitest/no-focused-tests");
  });

  it("fails jsx-a11y on clickable div outside legacy", async () => {
    const messages = await lintFixtureAs(
      "src/test/lint-fixtures/components/home/clickable-div.tsx",
      "src/components/home/__lint-fixtures__/clickable-div.tsx",
    );
    expect(ruleIds(messages).some((id) => id.startsWith("jsx-a11y/"))).toBe(
      true,
    );
  });

  it("allows French apostrophe in JSX text", async () => {
    const messages = await lintFixtureAs(
      "src/test/lint-fixtures/components/home/french-apostrophe.tsx",
      "src/components/home/__lint-fixtures__/french-apostrophe.tsx",
    );
    expect(ruleIds(messages)).not.toContain("react/no-unescaped-entities");
  });

  it("blocks raw CSS locators in e2e specs", async () => {
    const messages = await lintFixtureAs(
      "src/test/lint-fixtures/e2e/raw-locator-snippet.ts",
      "e2e/probe.spec.ts",
    );
    expect(ruleIds(messages)).toContain("playwright/no-raw-locators");
  });

  it("blocks waitForTimeout in e2e specs", async () => {
    const messages = await lintFixtureAs(
      "src/test/lint-fixtures/e2e/wait-timeout-snippet.ts",
      "e2e/probe.spec.ts",
    );
    expect(ruleIds(messages)).toContain("playwright/no-wait-for-timeout");
  });

  it("configures react/no-unescaped-entities to forbid > in JSX text", async () => {
    const eslint = createEslint();
    const config = await eslint.calculateConfigForFile(
      path.join(
        root,
        "src/components/home/__lint-fixtures__/jsx-greater-than.tsx",
      ),
    );
    const rule = config.rules?.["react/no-unescaped-entities"];
    expect(rule?.[1]).toEqual({ forbid: [">", "}"] });
    expect(rule?.[0]).toBe(2);
  });
});
