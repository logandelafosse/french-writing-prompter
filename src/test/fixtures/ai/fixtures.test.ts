import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { Evaluation } from "@/contracts/evaluation";

const FIXTURES_DIR = path.join(import.meta.dirname, ".");

describe("AI fixtures", () => {
  const validFiles = fs
    .readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith(".valid.json"));

  const invalidFiles = fs
    .readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith(".invalid.json"));

  for (const file of validFiles) {
    it(`${file} parses with Evaluation schema`, () => {
      const text = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8");
      const parsed = Evaluation.safeParse(JSON.parse(text));
      expect(parsed.success, parsed.success ? "" : String(parsed.error)).toBe(
        true,
      );
    });
  }

  for (const file of invalidFiles) {
    it(`${file} fails Evaluation schema`, () => {
      const text = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8");
      const parsed = Evaluation.safeParse(JSON.parse(text));
      expect(parsed.success).toBe(false);
    });
  }
});
