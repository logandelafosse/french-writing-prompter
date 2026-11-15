# T24 — DLF index and attribution

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 2 | HITL (Q6) | T23 | ~250 |

**Owner question Q6:** Is the DLF-derived index committed or generated locally (licensing, repo visibility)? **Default if accepted:** gitignored and generated locally from `../DLF-extract/out/canonical.jsonl`. This spec assumes the default.

## User stories

- As Logan, I want a Louisiana suggestion to carry a `DLF` badge when the Dictionary of Louisiana French attests that form, so that I know which suggestions are backed by the dictionary.
- As Logan, I want a word that is in the DLF never to be flagged as a Faute, so that the tutor doesn't correct real Louisiana words.

## What to build

`npm run dlf:build` runs a build script that reads `DLF_CANONICAL_PATH` (default `../DLF-extract/out/canonical.jsonl`). It normalizes spellings (NFC, lowercase, `’`→`'`) and drops noisy forms, entries without senses, and capitalized headwords. It writes `src/data/dlf/spellings.json` with a `meta` block (source hash, entry count, build date). The output path is gitignored.

A server-only `dlf` module loads the index lazily, once per process. `lookup(word)` tries an exact match, then plural stripping, then accent folding; accent-folded hits are flagged `accentMismatch`. If the index file is missing, the module logs once and every lookup returns no hits. The evaluation never fails because of the DLF.

The evaluator uses the DLF in two ways:

1. **Before the model call:** content words of 4+ letters in the learner text that are found in the DLF (capped at about 40) are injected as "attested in DLF, don't flag".
2. **After the model call:** for each `standard` Correction, the post-processor looks up `dlf_headword`, then the full suggestion, then each token of 3+ letters. The first hit that is exact or plural-stripped sets `dlf = { entryId, headword }`. A miss or an accent-only match sets `dlf = null`. The Correction stays, and only the badge is hidden.

DLF is positive evidence only: a miss never removes a Correction, changes its kind, or makes something a Mistake. A `standard` card with `dlf` set shows `<abbr title="Dictionary of Louisiana French">DLF</abbr>` after the Louisiana form.

Tests and Playwright never read `../DLF-extract`. They point `DLF_INDEX_PATH` at a small committed fixture index containing a handful of entries (e.g. `asteur`, `icitte`, `boucoup`).

## Acceptance criteria

- [ ] `[unit]` The build transform, run on a fixture JSONL, normalizes spellings, drops digit/punctuation/over-30-char forms, entries without senses, and capitalized headwords, and emits `meta` with an entry count.
- [ ] `[unit]` `lookup` returns an exact hit, a plural-stripped hit (`chevrettes` → `chevrette`), and an accent-folded hit flagged `accentMismatch`.
- [ ] `[unit]` With a missing index file, `lookup` returns `[]` and does not throw.
- [ ] `[unit]` The post-processor sets `dlf` for a `standard` Correction whose suggestion is in the fixture index, and leaves `dlf = null` but keeps the Correction when it is not.
- [ ] `[unit]` The post-processor never changes a Correction's kind or drops it because of a DLF miss.
- [ ] `[unit]` The evaluator prompt builder lists the DLF hits found in the learner text, capped at 40.
- [ ] `[check]` `src/data/dlf/` is in `.gitignore`. The `dlf` module imports `server-only`. No client bundle imports it.
- [ ] `[e2e]` With the fixture index, a `standard` Correction `Maintenant` → `Asteur` shows a `DLF` abbreviation with title `Dictionary of Louisiana French`. A second `standard` Correction whose suggestion is not in the index shows no badge. Check at 1280 px and 390 px.
- [ ] `[check]` `npm run check` passes. The production diff is under 500 lines, excluding the generated index and fixtures.

## Tests to write first

- dlf build: drops noisy forms and capitalized headwords
- dlf lookup: exact, plural-stripped, and accent-folded hits
- dlf lookup: missing index yields no hits
- post-processor: attaches dlf on a hit and keeps the Correction on a miss
- evaluator prompt: injects attested words from the learner text
- review e2e: DLF badge only on attested suggestions

## Out of scope

- Committing the index: depends on the Q6 answer. If Logan chooses "commit", a follow-up removes the gitignore entry.
- Supplementing lost entries (`char`, `maringouin`) through `dlfRef` in the base rules: needs owner verification, not planned.
- DLF examples as comprehensible input: later.

## References

- `backend-requirements.md`: §6.2 (measurements and plan), §4.2 prompt item 2 and post-processing item 5, §8 Q1.
- `implementation-map.md`: §2.4 CorrectionCard (`DLF` badge), §6 gap list (badge as `<abbr>`).
- `HANDOFF.md`: Correction table (Standard→Louisiana row).
- `plan.md`: Q6.
