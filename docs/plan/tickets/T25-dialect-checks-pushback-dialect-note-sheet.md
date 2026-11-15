# T25 — Dialect checks, pushback, Add Dialect Note sheet

| Phase | Type | Blocked by | Production lines (est.)       |
| ----- | ---- | ---------- | ----------------------------- |
| 2     | AFK  | T22        | ~480 (close to the 500 limit) |

## User stories

- As Logan, when the tutor isn't sure a form is Louisiana French, I want it to ask me (`ÇA SE DIT COMME ÇA ?`) instead of marking it wrong, so that my dialect is respected.
- As Logan, when I answer `Oui, c'est à nous-autres` or push back on a Faute with `C'est du français louisianais`, I want to save a Dialect Note and never be flagged for that form again.
- As Logan, when I answer `Non, corrige-le`, I want the check to become a normal Faute, so that it counts like any other.

## What to build

**Evaluator.** T21 already emits `dialect_check` Corrections (with `question`, `suggestion`, `category`, `rule_if_dialect`, and the question template). This ticket extends the output schema with the nullable `context_quote`, `dialect_example`, `dialect_lemma` and `dialect_pattern` fields, filled for `mistake` and `dialect_check`, and stores them on the Correction. Fallbacks when they are null:

- lemma: the quote
- example: the sentence containing the quote
- pattern: the `Toute la famille` radio is hidden

**Review UI.** A dialect check renders with a `dialect` tint fill, a wavy underline, a squared `N ?` marker, and visually hidden text `à vérifier N`. Its card has the `ÇA SE DIT COMME ÇA ?` label, the context quote highlighted, the question, and two buttons:

- `Oui, c'est à nous-autres` (dialect solid) opens the sheet.
- `Non, corrige-le` calls `PATCH /api/corrections/:id { action: "reject_dialect" }` (`open → confirmed_mistake`). The card re-renders as a `FAUTE` card with no actions, and the summary counts update.

Open Mistake cards gain the quiet `C'est du français louisianais` button, which also opens the sheet.

**DialectNoteSheet.** This is a new component in `from-correction` mode.

- Accessibility: `role="dialog"`, `aria-modal="true"`, labelled by the h2 `Ajouter une note de dialecte`. Focus is trapped while it is open. Escape, `Fermer` and `Annuler` dismiss it. Focus returns to the button that opened it.
- Layout: on desktop (≥ 640 px) it is a 560 px right-hand panel over the scrim. On mobile it is a full-width bottom sheet (max-height ~90vh, scrollable body, sticky footer).
- Motion: it slides in from the right on desktop and up on mobile, with no animation under `prefers-reduced-motion`.
- Content: the read-only `T'as écrit` / `Le tuteur proposait` row; `La règle` (model-drafted, editable); `Un exemple`; the `Ça vaut pour` radios (`Ce mot seulement : « {lemma} »` / `Toute la famille : {pattern}`); `Annuler` / `Sauver la note`.

**Saving.** `POST /api/dialect-notes` with `fromCorrectionId` creates the note (adding the `dialect_notes` migration) and, in one transaction, moves the Correction to `confirmed_dialect` or `overturned`. In the UI, the mark clears to plain text, the card is replaced by `Note de dialecte sauvée` (inferred copy) with a link to `/carnet`, the counts update, and focus moves to the next open card.

**Never flagged again.** Every evaluation injects active notes under "Formes confirmées par l'apprenant — ne les signale JAMAIS". The post-processor drops any `mistake` or `dialect_check` that matches an active word-scope note (backend-requirements §4.2 item 2).

## Acceptance criteria

- [ ] `[unit]` The sheet draft uses the quote as the lemma and the containing sentence as the example when the model returns null for those fields, and hides the pattern radio when `dialect_pattern` is null.
- [ ] `[unit]` Transitions: `dialect_check open → confirmed_mistake | confirmed_dialect`, and `mistake open|acknowledged → overturned`. Every other transition is rejected.
- [ ] `[unit]` `countsAsMistake` is true for `confirmed_mistake` and false for `overturned`, `confirmed_dialect` and an open `dialect_check`.
- [ ] `[unit]` The post-processor drops a `mistake` whose quote matches an active word-scope note's `form` or `learnerForm`, and keeps it when the note is soft-deleted.
- [ ] `[unit]` The evaluator prompt builder lists active notes (word-scope forms, pattern-scope rule text) and omits deleted notes.
- [ ] `[integration]` `POST /api/dialect-notes` with `fromCorrectionId` creates the note and resolves the Correction atomically. It returns 409 for an already-resolved or `standard` Correction, 404 for an unknown id, and 422 for a rule under 3 chars.
- [ ] `[integration]` `PATCH … { action: "reject_dialect" }` on a `mistake` returns 409.
- [ ] `[e2e]` Answering `Non, corrige-le` turns the card into `FAUTE` and the summary gains one `faute`. Check at 1280 px and 390 px.
- [ ] `[e2e]` `Oui, c'est à nous-autres` opens a dialog named `Ajouter une note de dialecte` with `a tombé` / `est tombé` pre-filled. Tab cycles inside the dialog. Escape closes it and focus returns to the button.
- [ ] `[e2e]` Saving clears the mark, shows `Note de dialecte sauvée`, and updates the summary. After a reload the mark is still cleared.
- [ ] `[e2e]` `C'est du français louisianais` on a Faute opens the same sheet. Saving removes that Faute from the summary count.
- [ ] `[e2e]` After a note for `a tombé` is saved, a second evaluation whose fake output flags `a tombé` as a Mistake shows no Correction for it.
- [ ] `[e2e]` At 390 px the sheet is a full-width bottom sheet. With reduced motion emulated it appears without a transition. axe reports no violations with the sheet open.
- [ ] `[check]` `npm run check` passes. The production diff is under 500 lines.

## Tests to write first

- correction transitions: allowed and rejected moves per kind
- post-processor: word-scope note suppresses a matching Mistake
- evaluator prompt: lists active notes, omits deleted ones
- dialect-notes route: creates note and resolves Correction in one transaction
- review e2e: Non, corrige-le converts to a Faute
- sheet e2e: opens, traps focus, closes on Escape, returns focus
- sheet e2e: saving clears the mark and persists
- evaluation e2e: saved form is not flagged again

## Out of scope

- The Carnet page, the notes list, and `new`/`edit` sheet modes: T26.
- Markdown export: T27.
- Weakness counts reacting to conversions or overturns: T28.
- Resource links on Mistake cards: T30.

## References

- `HANDOFF.md`: Correction table, Add Dialect Note sheet, Motion item 3, Accessibility.
- `implementation-map.md`: §2.4 MarkedText, CorrectionCard states. §2.6 DialectNoteSheet. §4.1, §4.4. §5 CorrectionCard and DialectNoteSheet copy. §6 gaps 13, 21, 37, 38, 40.
- `backend-requirements.md`: §1 `Correction`, `DialectNote`. §2.2 `dialect_notes`. §3 Corrections and Dialect Notes. §4.2 items 2–3 and post-processing items 2–3. §6.1.
- Tickets: T21 (dialect_check output and question template), T22 (CorrectionCard and `PATCH` route).
- Screens: `Corrections.dc.html` (right column), `DialectNote.dc.html`, `HomeReview.dc.html`, `MobileReview.dc.html`.
