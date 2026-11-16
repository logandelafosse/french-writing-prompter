#!/usr/bin/env tsx
/**
 * Installs the pinned DLF lexicon Release asset from DLF-extract.
 *
 *   DLF_LEXICON_VERSION=x.y.z npm run dlf:fetch
 *
 * Until DLF-extract publishes that asset, this prints how to pin and exits 1.
 * Tests and Playwright use the committed fixture via DLF_LEXICON_PATH.
 * See docs/plan/dlf-lexicon.md.
 */
import fs from "node:fs";
import path from "node:path";

const DEST = path.join("src", "data", "dlf", "lexicon.json");
const FIXTURE = path.join("src", "test", "fixtures", "dlf", "lexicon.json");
const VERSION_PIN = path.join("src", "data", "dlf", "version");

async function main(): Promise<void> {
  const version = process.env.DLF_LEXICON_VERSION;
  if (version === undefined || version.length === 0) {
    console.log(
      `DLF_LEXICON_VERSION is unset. Tests use the fixture at ${FIXTURE}.\n` +
        `Publish a lexicon from DLF-extract, then:\n` +
        `  DLF_LEXICON_VERSION=x.y.z npm run dlf:fetch\n` +
        `See docs/plan/dlf-lexicon.md.`,
    );
    return;
  }

  const url = `https://github.com/logandelafosse/DLF-extract/releases/download/dlf-lexicon-v${version}/dlf-lexicon.json`;
  console.log(`Fetching ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    console.error(
      `Fetch failed (${String(response.status)}). The DLF-extract lexicon publisher is not cut yet.\n` +
        `Keep using ${FIXTURE}, or publish dlf-lexicon-v${version} and retry.\n` +
        `See docs/plan/dlf-lexicon.md.`,
    );
    process.exitCode = 1;
    return;
  }
  const text = await response.text();
  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  fs.writeFileSync(DEST, text);
  fs.writeFileSync(VERSION_PIN, `${version}\n`);
  console.log(`Installed DLF lexicon ${version} → ${DEST}`);
}

void main();
