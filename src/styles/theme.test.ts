import { compile } from "@tailwindcss/node";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = path.join(import.meta.dirname, "../app");

describe("globals.css theme compilation", () => {
  it("resolves design-token utilities to token values", async () => {
    const css = readFileSync(path.join(APP_DIR, "globals.css"), "utf-8");
    const compiled = await compile(css, {
      base: APP_DIR,
      onDependency: () => {},
    });

    const utilities = compiled.build([
      "bg-sheet",
      "text-ink",
      "font-sans",
      "font-serif",
      "rounded-base",
      "shadow-sheet",
      "max-w-home",
      "text-prompt",
    ]);

    expect(utilities).toMatch(/background-color:\s*var\(--color-sheet\)/);
    expect(utilities).toMatch(/color:\s*var\(--color-ink\)/);
    expect(utilities).toMatch(
      /\.font-sans\s*\{[^}]*font-family:[^}]*var\(--font-bricolage\)/,
    );
    expect(utilities).toMatch(
      /\.font-serif\s*\{[^}]*font-family:[^}]*var\(--font-newsreader\)/,
    );
    expect(utilities).toMatch(/border-radius:\s*var\(--radius-base\)/);
    expect(utilities).toMatch(/\.shadow-sheet\s*\{[\s\S]*0 18px 40px -28px/);
    expect(utilities).toMatch(/max-width:\s*var\(--container-home\)/);
    expect(utilities).toMatch(/font-size:\s*var\(--text-prompt\)/);

    expect(utilities).not.toMatch(/--font-sans:\s*var\(--font-sans\)/);
  });

  it("resets the default palette so zinc utilities do not exist", async () => {
    const css = readFileSync(path.join(APP_DIR, "globals.css"), "utf-8");
    expect(css).toMatch(/--color-\*:\s*initial/);

    const compiled = await compile(css, {
      base: APP_DIR,
      onDependency: () => {},
    });
    const utilities = compiled.build(["bg-zinc-100", "text-emerald-700"]);
    expect(utilities).not.toMatch(/--color-zinc-100/);
    expect(utilities).not.toMatch(/\.bg-zinc-100/);
    expect(utilities).not.toMatch(/--color-emerald-700/);
  });
});
