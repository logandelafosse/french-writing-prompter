import { compile } from "@tailwindcss/node";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = path.join(import.meta.dirname, "../app");

describe("globals.css base layer", () => {
  it("defines a focus-visible ring and a reduced-motion reset", async () => {
    const css = readFileSync(path.join(APP_DIR, "globals.css"), "utf-8");
    const compiled = await compile(css, {
      base: APP_DIR,
      onDependency: () => {},
    });

    const base = compiled.build([]);

    expect(base).toMatch(
      /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-primary\)/,
    );
    expect(base).toMatch(/outline-offset:\s*2px/);
    expect(base).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation-duration:\s*0\.01ms !important/,
    );
    expect(base).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation-name:\s*none !important/,
    );
    expect(base).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*transition-duration:\s*0\.01ms !important/,
    );
  });
});
