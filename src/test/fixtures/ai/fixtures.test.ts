import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { Evaluation, EvaluatorOutputSchema } from "@/contracts/evaluation";
import { GeneratorModelOutput } from "@/contracts/prompt-meta";
import { parseJson } from "@/lib/json";

const FIXTURES_DIR = path.join(import.meta.dirname, ".");

describe("AI fixtures", () => {
  const validFiles = fs
    .readdirSync(FIXTURES_DIR)
    .filter(
      (name) => name.endsWith(".valid.json") && name.startsWith("evaluation."),
    );

  const invalidFiles = fs
    .readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith(".invalid.json"));

  for (const file of validFiles) {
    it(`${file} parses with Evaluation schema`, () => {
      const text = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8");
      const parsed = parseJson(Evaluation, text);
      if (!parsed.ok) {
        throw new Error(String(parsed.cause));
      }
      expect(parsed.ok).toBe(true);
    });
  }

  for (const file of invalidFiles) {
    it(`${file} fails Evaluation schema`, () => {
      const text = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8");
      const parsed = parseJson(Evaluation, text);
      expect(parsed.ok).toBe(false);
    });
  }

  it("prompt-generator.valid.json parses with GeneratorModelOutput schema", () => {
    const text = fs.readFileSync(
      path.join(FIXTURES_DIR, "prompt-generator.valid.json"),
      "utf8",
    );
    const parsed = parseJson(GeneratorModelOutput, text);
    if (!parsed.ok) {
      throw new Error(String(parsed.cause));
    }
    expect(parsed.ok).toBe(true);
  });

  it("evaluation.weakness fixtures parse with EvaluatorOutputSchema", () => {
    for (const file of [
      "evaluation.weakness.json",
      "evaluation.weakness-repeat.json",
    ]) {
      const text = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8");
      const parsed = parseJson(EvaluatorOutputSchema, text);
      if (!parsed.ok) {
        throw new Error(`${file}: ${String(parsed.cause)}`);
      }
      expect(parsed.ok).toBe(true);
    }
  });

  it("prompt-generator.invalid.json fails GeneratorModelOutput schema", () => {
    const text = fs.readFileSync(
      path.join(FIXTURES_DIR, "prompt-generator.invalid.json"),
      "utf8",
    );
    const parsed = parseJson(GeneratorModelOutput, text);
    expect(parsed.ok).toBe(false);
  });
});
