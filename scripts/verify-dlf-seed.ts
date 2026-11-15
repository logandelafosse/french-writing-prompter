#!/usr/bin/env tsx
/**
 * Verifies LOUISIANA_VOCABULARY_HEADWORDS are DLF headwords in canonical.jsonl.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { LOUISIANA_VOCABULARY_HEADWORDS } from "../src/modules/dialect/louisiana-rules";
import { parseJson } from "../src/lib/json";

const CanonicalLine = z.object({ headword: z.string() });

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const canonicalPath = path.resolve(
  repoRoot,
  "../DLF-extract/out/canonical.jsonl",
);

const words = [...LOUISIANA_VOCABULARY_HEADWORDS];
if (words.length > 30) {
  console.error(`Seed list has ${words.length} words; limit is 30.`);
  process.exit(1);
}

const headwords = new Set<string>();
for (const line of fs.readFileSync(canonicalPath, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const parsed = parseJson(CanonicalLine, line);
  if (!parsed.ok) {
    console.error("Malformed canonical.jsonl line:", line);
    process.exit(1);
  }
  headwords.add(parsed.value.headword);
}

const missing = words.filter((w) => !headwords.has(w));
if (missing.length > 0) {
  console.error(
    "Headwords missing from DLF canonical.jsonl:",
    missing.join(", "),
  );
  process.exit(1);
}

console.log(`OK: ${words.length} Louisiana headwords present in DLF extract.`);
