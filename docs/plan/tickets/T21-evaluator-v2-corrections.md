# T21 — Evaluator v2: Corrections, quote location, French output

| Phase | Type              | Blocked by | Production lines (est.) |
| ----- | ----------------- | ---------- | ----------------------- |
| 1     | AFK (Q4 answered) | T06, T17   | ~480                    |

**Mistake taxonomy (Q4, answered 2026-11-15):** use the 15 categories plus `autre` in `backend-requirements.md` §1.1 as-is for v1, with their French labels and "Louisiana note (never a Mistake)" column fed to the evaluator. IDs are persisted; labels can change later, merging IDs cannot. Logan approved this as a starting set.

## User stories

- As Logan, I want the tutor to point at the exact words that are wrong and explain why in French, so that I learn from each text.
- As Logan, I want Standard French in my writing never treated as wrong, in the Corrections or in my scores and overall CEFR Level.

## What to build

Server only (backend §4.2, slice S7a). The UI keeps the T16 placeholder working off the new response.

- **Output schema** `EvaluatorOutputSchema` (zod, Structured-Outputs strict: nullable not optional): four dimension scores 1–6 with comments, `overall_cefr`, `summary`, `next_level_tip`, and up to 15 `corrections` with `kind` (`mistake | standard | dialect_check`), `quote`, `occurrence`, `suggestion`, `explanation`, `category` (Mistake category enum, Q4), `question`, `rule_if_dialect`, `dlf_headword`, `resource_ids`.
- **Prompt `evaluator@2`** (`buildEvaluatorPrompt`): all explanations, questions, summary and tip in French, Louisiana preferred, Standard acceptable, never English; dialect block from the T06 module; the three kinds as defined in §4.2 step 3 (at most 3 `standard`; "si tu hésites, choisis `dialect_check`"); quoting rules; explicit instruction that Standard French forms never lower a dimension score or `overall_cefr`. Judge **Registre et style** against the session’s `promptMeta.registre` (`formel` / `familier` / `mixt`): mismatch with the dictated registre is a Register issue, not a dialect Mistake. Focus, Dialect Notes, DLF hints and Resource IDs are omitted until T29, T25, T24 and T30 respectively.
- **`locateQuote` + `postProcessEvaluation`** (pure, §4.2 post-processing steps 1, 3, 6, 7): exact `n`-th occurrence → cursor fallback → normalised search (NFC, curly apostrophe, NBSP/narrow NBSP, collapsed whitespace, case-fold) → punctuation-stripped retry → `span = null, anchor = "none"`. Overlapping spans become unanchored. Unlocatable Corrections are kept and listed. Kind invariants (standard → `category null`, `resource_ids []`; missing/unknown category → `autre`; missing `question` → template; standard whose suggestion equals the quote is dropped). `isFocus = false`, `dlf = null`, `resourceIds = []` for now. `ordinal` by span start, unanchored after their predecessor; uuid ids.
- **Storage**: `corrections` table (backend §2.2) via generated migration; `EvaluationV2` stored in `evaluation_json`, raw model JSON in `evaluation_raw`; `parseStoredEvaluation` never throws (v2 / v1 / malformed / none).
- **Route**: `POST /api/sessions/:id/evaluate` `{ text }` → `{ session, evaluation, corrections, advancement }`; keeps T17 behaviour (text saved before the AI call, `ALREADY_EVALUATED`). `POST /api/evaluate` becomes a thin alias for this ticket only.
- **Fixtures** in `src/modules/writing-evaluator/__fixtures__/` (backend §4.5): `ok-mixed-kinds`, `quote-not-found`, `quote-wrong-case-curly-apostrophe`, `duplicate-quote-occurrence-2`, `overlapping-quotes`, `unknown-category`, `english-explanations`, `invalid-json.txt`, `missing-field`. The e2e fake AI client serves `ok-mixed-kinds`.
- Update `CONTEXT.md`: Evaluation now includes Corrections; Standard French is never wrong (implementation-map §6.50); add Correction, Mistake, Standard→Louisiana, Dialect check.

## Acceptance criteria

- [ ] [unit] `locateQuote` table: exact; 2nd occurrence; curly vs straight apostrophe; NBSP; case difference; trailing punctuation; not found → `null`/`none`; offsets are UTF-16 indices into the stored text and `text.slice(start,end)` equals the matched source.
- [ ] [unit] Overlapping second quote is kept with `span: null`.
- [ ] [unit] Kind invariants: standard never carries a category; unknown category → `autre`; dialect_check without question gets the template; standard with suggestion === quote is dropped.
- [ ] [unit] `countsAsMistake` (backend §1) returns false for every `standard` Correction regardless of status.
- [ ] [unit] Prompt builder: system prompt is French, names the three kinds, states Standard French is never penalised in scores or overall CEFR, and contains the Q4 category IDs.
- [ ] [unit] `parseStoredEvaluation` returns `malformed` for `{"score": 5}`, `v1` for a legacy row, `v2` for a new row; never throws.
- [ ] [integration] Every fixture runs through schema + post-processing with a snapshot of the resulting Corrections; `invalid-json` and `missing-field` raise `AiOutputError` (T04) and the route answers 502 `AI_INVALID_OUTPUT`.
- [ ] [integration] Evaluate route persists Corrections rows with ordinals in text order and returns them; second call → 409.
- [ ] [e2e] Submitting from Phase B at 1280 px still shows the placeholder Evaluation with scores (no regression).
- [ ] [check] No `.optional()` in `*OutputSchema`; the evaluator reaches the model only through T04's `chatCompletionJSON`, with no raw `JSON.parse`.

## Tests to write first

- `locateQuote anchors exact, nth, normalized and punctuation-stripped quotes`
- `postProcessEvaluation keeps unlocatable corrections unmarked`
- `postProcessEvaluation enforces kind invariants`
- `standard corrections never count as mistakes`
- `evaluator prompt is French and forbids penalising Standard French`
- `parseStoredEvaluation classifies v2, v1 and malformed rows`
- `fixtures produce stable corrections` (snapshot per fixture)
- `evaluate route stores corrections in text order`

## Out of scope

- Review screen, MarkedText, cards, Scores, `Compris` endpoint (T22).
- DLF attribution and hints (T24); Dialect Note guard and pushback (T25); Resources (T30); Focus tag (T29).
- `PATCH /api/corrections/:id` transitions other than what T22 needs.

## References

- `HANDOFF.md` → Correction (three kinds), UI copy rules (tutor explanations are not post-processed).
- `implementation-map.md` §4.1 (note: use backend status names), §4.2, §6 items 12, 49, 50.
- `backend-requirements.md` §0 D3, D4; §1 (Correction, `countsAsMistake`, EvaluationV2/V1, StoredEvaluation), §1.1; §2.2 `corrections`, `evaluation_raw`; §3 evaluate route; §4.1; §4.2; §4.5; §7 S7.
- `plan.md` Q4.
