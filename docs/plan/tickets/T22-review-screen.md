# T22 — Review screen: marked text, Mistake cards, Scores

| Phase | Type              | Blocked by | Production lines (est.)                             |
| ----- | ----------------- | ---------- | --------------------------------------------------- |
| 1     | AFK (Q5 answered) | T16, T21   | ~500 (at the limit; see split note in Out of scope) |

**Score display (Q5, answered 2026-11-15):** Claude Design style — each dimension shows a CECR sub-level (`A2+`, `B1`, …), not `N / 6`. French labels: `Grammaire`, `Vocabulaire`, `Cohérence`, `Registre et style`. Scores collapsed by default (`Scores ▸` + `Ensemble : {level}`). Hover (desktop) / tap (mobile) on a dimension row opens a popover with (1) what the category measures and (2) a short **Pour monter** tip for this Evaluation. Holistic `next_level_tip` remains one line inside the open Scores. Mapping: evaluator may keep internal 1–6; UI maps to CECR sub-levels via a documented table, or the model emits per-dimension CECR — pick one approach in the PR and test both ends. Mockup: `docs/design/mockups/q5-scores.html`.

## User stories

- As Logan, I want my Mistakes marked right in my text with a numbered card beside each, so that I see what went wrong where I wrote it.
- As Logan, I want the scores tucked away by default, so that I focus on the Corrections first.
- As Logan, I want to mark a Mistake as understood and move straight on to the next prompt.

## What to build

Phase C of the Home state machine replaces the T16 placeholder.

- **ReviewLayout**: desktop `max-width: 1200px`, title row (date h1), flex row that wraps: sheet `flex: 1 1 520px`, Corrections `flex: 1 1 420px`. Mobile (< 640 px): h1 `Évaluation`, no date title, Corrections under the text.
- **Sheet** (`aria-label="Consigne et ton texte"`): PromptSheet `review` mode (17 px ink-2 prompt, 13 px meta; meta omitted on mobile), label `Ton texte · {n} mots`, then **MarkedText** (`lang="fr"`, paragraphs on blank lines, 18/34 desktop, 17/32 mobile).
- **MarkedText**: slices the stored text by `span` (UTF-16). Mistake marks: tint fill + 2 px solid underline + filled round `<sup>` marker with the ordinal, rendered as a link to `#correction-N` labelled `faute N`; visually hidden `(faute N)` after each mark. `standard` and `dialect_check` Corrections render no in-text mark yet. Unanchored Corrections render no mark.
- **CorrectionsRegion**: `<section aria-live="polite" aria-label="Évaluation">` (`Corrections` on mobile) with h2 `Évaluation` (`tabIndex=-1`) and **EvaluationSummary** `{n} fautes · {n} en français standard · {n} à vérifier` (singular `1 faute`; zero parts omitted; all zero → `Aucune correction`). When the Evaluation arrives, focus moves to the h2; the live text is the short summary, not the card list.
- **CorrectionCard, Mistake variant**: `<article id="correction-N">`, marker pill + `Faute` label (uppercased by CSS), quote line `<s>quote</s> → <strong>suggestion</strong>` with hidden "avant :" text, French explanation as plain text, secondary `Compris`. Cards in ordinal order. `Compris` calls `PATCH /api/corrections/:id { action: "acknowledge" }` (backend §3 Corrections, mistake/standard `open → acknowledged` only in this ticket); the card collapses to header + muted quote, the mark stays, state survives reload (§6.20); focus moves to the next open card.
- **Other kinds**: `standard` and `dialect_check` render as plain list items (`quote → suggestion` + explanation/question) until T23/T25.
- **ScoresDisclosure** (Base UI Collapsible): closed `Scores ▸` + `Ensemble : {level}`; open `Scores ▾`, four dimension rows with CECR sub-level chips, then the tip line. Collapsed by default. Each row is hoverable/focusable (tap on touch): popover with category definition + **Pour monter** tip for this Evaluation (from the dimension comment / improve text). See `docs/design/mockups/q5-scores.html`.
- **CTA**: primary `Une autre consigne · reste {n}` (button, generates → Phase B); at 0 disabled `Une autre consigne · à minuit`.
- `GET /api/today` resolves an evaluated session from today (most recent, if no newer active session) to Phase C with its Evaluation and Corrections, so reload keeps the review.

## Acceptance criteria

- [ ] [unit] MarkedText: mistakes wrap exactly `text.slice(start,end)`; unanchored and non-mistake Corrections produce no `<mark>`; paragraphs split on blank lines; every mark has hidden `(faute N)` text and a marker link to `#correction-N`.
- [ ] [unit] EvaluationSummary: `3 fautes · 2 en français standard · 1 à vérifier`, `1 faute`, zero parts omitted, `Aucune correction`.
- [ ] [unit] ScoresDisclosure starts collapsed with `aria-expanded="false"`; opening shows four Q5 labels with CECR chips (e.g. `A2+`) and the tip; focusing a row reveals the category definition and Pour monter text.
- [ ] [integration] `PATCH /api/corrections/:id` acknowledges an open mistake; acknowledging twice or an unknown transition → 409; unknown id → 404.
- [ ] [integration] `/api/today` after an evaluation returns Phase C data with Corrections and their statuses.
- [ ] [e2e] 1280 px with fixture `ok-mixed-kinds`: after submit, prompt and text remain; Mistakes are marked with numbered markers; cards sit to the right; summary line matches the fixture; `Scores ▸` is collapsed; focus is on the `Évaluation` heading.
- [ ] [e2e] Clicking marker `1` moves to card 1; `Compris` collapses it and focus moves to card 2; reload keeps it collapsed and the mark present.
- [ ] [e2e] An unlocatable Correction from the fixture appears as a card with no mark in the text.
- [ ] [e2e] `Scores ▸` opens to `Grammaire`, `Vocabulaire`, `Cohérence`, `Registre et style` with CECR chips and `Ensemble : B1`; hovering or focusing `Registre et style` shows its popover.
- [ ] [e2e] `Une autre consigne · reste 2` returns to Phase B with a new prompt; at quota 0 the CTA reads `Une autre consigne · à minuit` and is disabled.
- [ ] [e2e] 390 px: h1 `Évaluation`, no date title, Corrections under the text, CTA full width. axe clean in both widths.

## Tests to write first

- `marked text wraps mistake spans and skips unanchored corrections`
- `evaluation summary pluralises and omits zero parts`
- `scores disclosure is collapsed by default and shows French labels out of 6`
- `acknowledge transition is allowed once for open mistakes`
- `review restores after reload with acknowledged state`
- e2e `review.spec.ts` at 1280 and 390 px

## Out of scope

- Standard→Louisiana marks/cards and DLF badge (T23, T24); Dialect check marks, pushback `C'est du français louisianais`, Add Dialect Note sheet (T25).
- Resource links on cards (T30); `focus du jour` tag and Carnet CTA link (T29).
- Marks paint-in motion (T35). Read-only past review (T32).
- **Split if over 500 lines**: T22a = layout + MarkedText + Mistake cards + summary + focus/aria-live; T22b = ScoresDisclosure + `Compris` endpoint + CTA + Phase C restore in `/api/today`.

## References

- `HANDOFF.md` → Home / Phase C, Correction (Mistake row), Accessibility.
- `screens/HomeReview.dc.html`, `screens/MobileReview.dc.html`, `screens/Corrections.dc.html` (Mistake column).
- `implementation-map.md` §2.4 (ReviewLayout, MarkedText, EvaluationSummary, CorrectionsRegion, CorrectionCard, ScoresDisclosure), §3.3, §4.2, §5 Review + CorrectionCard, §6 items 2, 3, 19, 20, 22, 25, 41, §7 slice 8.
- `backend-requirements.md` §1 (Correction, CorrectionStatus), §3 Corrections (`PATCH`, transitions), §7 S7.
- `plan.md` Q5.
