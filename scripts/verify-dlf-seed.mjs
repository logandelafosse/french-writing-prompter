#!/usr/bin/env node
/**
 * Verifies LOUISIANA_VOCABULARY_HEADWORDS are DLF headwords in canonical.jsonl.
 * Run: node scripts/verify-dlf-seed.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const rulesPath = path.join(repoRoot, "src/modules/dialect/louisiana-rules.ts");
const canonicalPath = path.resolve(
  repoRoot,
  "../DLF-extract/out/canonical.jsonl",
);

const rulesSource = fs.readFileSync(rulesPath, "utf8");
const match = rulesSource.match(
  /LOUISIANA_VOCABULARY_HEADWORDS = \[([\s\S]*?)\] as const/,
);
if (!match) {
  console.error("Could not parse LOUISIANA_VOCABULARY_HEADWORDS");
  process.exit(1);
}

const words = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
if (words.length > 30) {
  console.error(`Seed list has ${words.length} words; limit is 30.`);
  process.exit(1);
}

const headwords = new Set();
for (const line of fs.readFileSync(canonicalPath, "utf8").split("\n")) {
  if (!line.trim()) continue;
  try {
    headwords.add(JSON.parse(line).headword);
  } catch {
    // skip malformed
  }
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
