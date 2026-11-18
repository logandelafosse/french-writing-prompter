# T24 — DLF lexicon, grader context, and attribution

GitHub issue: #26

| Phase | Type              | Blocked by | Production lines (est.) |
| ----- | ----------------- | ---------- | ----------------------- |
| 2     | AFK (Q6 answered) | T23        | ~250                    |

**Q6 (answered 2026-11-15):** inherit DLF via a **published lexicon artifact** from `logandelafosse/DLF-extract` (option 1), not a spellings-only index and not a git submodule. Consigne pins a version; graders receive definitions and Louisiana usage examples for relevant words.

## User stories

- As Logan, I want the tutor to know how a Louisiana word is used (gloss + example), so that Corrections and tips match real usage, not Standard French guesses.
- As Logan, I want a Louisiana suggestion to carry a `DLF` badge when the form is attested, so that I can trust the spelling.
- As an agent implementing Consigne, I want a versioned lexicon dependency, so that DLF improvements flow down when we bump the pin without cloning extract pipelines.

## What to build

### Lexicon artifact (contract with DLF-extract)

Document the contract in this PR (and link an issue/PR on DLF-extract if the publisher lands separately):

- Artifact: JSON (or JSONL) of entries `{ id, headword, forms[], senses: [{ pos, glosses[], examples: [{ louisiana_french_text, translation }] }] }` — trimmed, no raw OCR articles.
- Built in DLF-extract from `out/canonical.jsonl` via something like `npm run export:lexicon`.
- Published as a **GitHub Release asset** and/or **GitHub Package** from the private DLF-extract repo (e.g. `@logandelafosse/dlf-lexicon@x.y.z`).
- Consigne pins the version in `package.json` or a lock file (`dlf-lexicon.version` + download script). Bumping the pin is how DLF changes inherit.

Until the publisher exists in DLF-extract, this ticket may land with:

1. The Consigne-side loader, lookup, prompt injection, and badge wiring against a **committed fixture lexicon** (20–50 entries with real glosses/examples), and
2. A `npm run dlf:fetch` script that installs/updates the artifact when `DLF_LEXICON_VERSION` is set,

with a follow-up HITL note on the board: “cut first DLF lexicon release.” Do not block the Correction UI on the first Release if the fixture covers e2e.

### Runtime in Consigne

- Server-only `dlf` module: lazy-load lexicon once per process; `lookup(word)` exact → plural-strip → accent-fold (`accentMismatch` flagged).
- **Before the model call:** content words (4+ letters) in the Student Writing that hit the lexicon (cap ~25–40) are injected as short cards: headword, gloss(es), one LA example (+ translation). Instruction: treat these as attested Louisiana usage; do not “correct” them toward Standard.
- **After the model call:** `standard` Corrections get `dlf = { entryId, headword }` when the suggestion/form is attested; miss → `dlf = null`, Correction kept, badge hidden. DLF is **positive evidence only**.
- UI: `DLF` `<abbr title="Dictionary of Louisiana French">` on attested Standard→Louisiana cards.
- Tests/Playwright use `DLF_LEXICON_PATH` → committed fixture; never require `../DLF-extract` or network to OpenAI/DLF in CI.

## Acceptance criteria

- [ ] `[unit]` Fixture lexicon load + `lookup`: exact, plural-stripped, accent-folded (`accentMismatch`).
- [ ] `[unit]` Missing lexicon file → empty lookups, no throw; Evaluation still completes.
- [ ] `[unit]` Prompt builder injects gloss + at least one LA example for hits found in learner text (capped); entries are truncated to a max token budget documented in code.
- [ ] `[unit]` Post-processor sets `dlf` on attested `standard` suggestions; miss keeps Correction, `dlf = null`.
- [ ] `[unit]` A miss never changes kind or creates a Mistake.
- [ ] `[check]` Lexicon loader is `server-only`; no client import of the full lexicon.
- [ ] `[check]` README or `docs/plan/` note describes how to bump `DLF_LEXICON_VERSION` / publish from DLF-extract.
- [ ] `[e2e]` Fixture: `Maintenant` → `Asteur` shows DLF badge; unattested suggestion shows none (1280 and 390).
- [ ] `[check]` Production diff under 500 lines excluding fixture data.

## Tests to write first

- dlf lookup: exact / plural / accent
- prompt injection includes gloss + example for fixture headword in text
- post-processor badge attach / miss
- e2e DLF badge on standard Correction

## Out of scope

- Implementing the DLF-extract `export:lexicon` + Release pipeline (sibling repo; track as a linked issue; Consigne documents the contract).
- Full-text search / embedding RAG over DLF.
- Using DLF examples as the Resource catalog (T30).
- Git submodule of DLF-extract.

## References

- `backend-requirements.md` §6.2 (measurements; extend from spellings-only to lexicon).
- `HANDOFF.md` Standard→Louisiana + DLF attribution.
- `plan.md` Q6.
- Conversation: graders need definitions/usage; option 1 artifact inheritance chosen over submodule.
