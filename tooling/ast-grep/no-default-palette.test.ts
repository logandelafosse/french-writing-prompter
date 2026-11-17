import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");

describe("ast-grep no-default-palette", () => {
  it("flags zinc class and raw hex style", () => {
    const palette = readFileSync(
      path.join(
        import.meta.dirname,
        "tests/no-tailwind-default-palette-test.yml",
      ),
      "utf8",
    );
    const raw = readFileSync(
      path.join(import.meta.dirname, "tests/no-raw-color-test.yml"),
      "utf8",
    );
    expect(palette).toContain("bg-zinc-100");
    expect(raw).toContain("style={{ color: '#333' }}");

    execFileSync(
      "npx",
      [
        "ast-grep",
        "test",
        "--skip-snapshot-tests",
        "--filter",
        "no-tailwind-default-palette|no-raw-color",
      ],
      { cwd: root, encoding: "utf8" },
    );
  });
});
