import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { Evaluation } from "@/contracts/evaluation";
import { parseJson } from "@/lib/json";

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
      const parsed = parseJson(Evaluation, text);
      expect(parsed.ok, parsed.ok ? "" : String(parsed.cause)).toBe(true);
    });
  }

  for (const file of invalidFiles) {
    it(`${file} fails Evaluation schema`, () => {
      const text = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8");
      const parsed = parseJson(Evaluation, text);
      expect(parsed.ok).toBe(false);
    });
  }
});
