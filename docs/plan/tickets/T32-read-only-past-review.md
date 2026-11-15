# T32 — Read-only past review

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 4 | AFK | T25, T31 | ~250 |

## User stories

- As Logan, I want to open a past evaluated session from the Historique and see my full text with its marks and Corrections, so that I can reread exactly what the tutor pointed out.
- As Logan, I want that past review to be read-only, so that rereading old work never changes my Weaknesses, Dialect Notes or level by accident.

## What to build

`/historique/[id]` renders the review for one evaluated session, read-only. Add the link `Lire tout le texte avec ses marques` under the excerpt in an expanded History row (T31 leaves it out so it never points at a missing page). This follows gap #28: past reviews are read-only. The data comes from `GET /api/sessions/:id` (`SessionDetail`). Add the route if an earlier ticket has not, applying the same defensive parsing as T31.

The page reuses the Phase C pieces from T22 and T25: `ReviewLayout`, `MarkedText`, `CorrectionCard` and `ScoresDisclosure`, with a read-only mode instead of copies.

- **Header**: h1 is the same title as the History row (Focus labels, else `{genre} · {date}`, else `Séance du {date}`). A meta line `{Weekday d month} · {n} fautes · {level}` sits under it, and a back link `← Historique` points to `/historique` (inferred copy).
- **Layout**: on desktop, the sheet (prompt with its meta line, then the marked text) sits beside the Corrections column. At 390 px the Corrections stack under the text, as in Phase C.
- **Cards**: no action buttons render on any card. That covers `Compris`, `C'est du français louisianais`, `Oui, c'est à nous-autres` and `Non, corrige-le`. Card state follows the stored Correction status:
  - Open and acknowledged Mistakes and Standard→Louisiana suggestions render as normal cards, with Resources and the `DLF` badge where present.
  - `confirmed_mistake` renders as a Mistake card.
  - `overturned` and `confirmed_dialect` render as the one-line `Note de dialecte sauvée` with a link to `/carnet`, and their marks render as plain text (gap #21).
  - An `open` Dialect check shows its question plus the line `Pas répondu` (inferred copy), with no buttons.
- **Scores**: `Scores ▸` is collapsed by default and expands as in Phase C.
- **Not on this page**: the `Une autre consigne · reste N` CTA, the Focus line, the `aria-live` region, the focus move on load, and the marks-paint motion.

Degraded data never crashes the page:

- An `evaluation_unreadable` session shows the prompt, the plain unmarked text, and the same inline Notice as History.
- A legacy v1 session shows the prompt, the plain text, `Évaluation d'avant les corrections` and the Scores.
- A Correction with `span = null` is listed as a card with no in-text mark.
- A non-numeric or unknown id, or a session that is not `evaluated`, renders the Next.js not-found page.

## Acceptance criteria

- [ ] `[integration]` `GET /api/sessions/:id` returns `SessionDetail` with Corrections for an evaluated session. It returns `404 NOT_FOUND` for an unknown id and `422 VALIDATION` for `abc`.
- [ ] `[unit]` In read-only mode, `CorrectionCard` renders no `<button>` for any of the three kinds in any status.
- [ ] `[unit]` In read-only mode, `overturned` and `confirmed_dialect` Corrections render `Note de dialecte sauvée` with a link to `/carnet`, and `MarkedText` renders their span unmarked.
- [ ] `[unit]` An `open` Dialect check in read-only mode shows its question and `Pas répondu`.
- [ ] `[e2e]` At 1280 and 390 px, a seeded session with all three Correction kinds shows numbered marks in the text. Each mark's marker links to its card (`#correction-N`), and the Corrections show the kind labels `FAUTE`, `FRANÇAIS STANDARD` and `ÇA SE DIT COMME ÇA ?`.
- [ ] `[e2e]` The page has zero buttons other than `Scores ▸`, which toggles `aria-expanded`.
- [ ] `[e2e]` From `/historique`, expanding a row and activating `Lire tout le texte avec ses marques` lands on this page. `← Historique` returns to the list.
- [ ] `[e2e]` A malformed session shows its prompt, its text and the Notice copy from History, and no marks.
- [ ] `[e2e]` `/historique/999999` and `/historique/abc` show the not-found page.
- [ ] `[e2e]` axe reports no serious or critical violations at either width.
- [ ] `[integration]` Loading the page sends no mutation requests: no `PATCH /api/corrections/*` and no `POST /api/dialect-notes`.

## Tests to write first

- `session detail route › 404 unknown id, 422 non-numeric`
- `CorrectionCard readOnly › renders no actions for any kind or status`
- `CorrectionCard readOnly › resolved dialect note collapses to one line`
- `MarkedText › resolved dialect note span renders as plain text`
- `historique-detail.spec › three kinds marked, no actions, at 1280 and 390`
- `historique-detail.spec › malformed session shows notice and plain text`

## Out of scope

- Answering an old Dialect check or pushing back from a past review: not planned. Read-only per gap #28.
- Viewing abandoned drafts in full: they stay as excerpts in History (T31).
- The marks-paint motion: T35, and it applies only on Evaluation arrival in Home.
- Placement sessions: their per-step results are shown on the Placement result screen (T34).

## References

- `HANDOFF.md` › Home / Phase C, Correction, Accessibility
- `implementation-map.md` §2.4 (ReviewLayout, MarkedText, CorrectionCard, ScoresDisclosure), §2.8 (SessionReviewPage), §3 routes, §6 gaps #20, #21, #28
- `backend-requirements.md` §1 (`CorrectionStatus`, `countsAsMistake`), §2.3, §3 › Prompts and sessions (`GET /api/sessions/:id`, `SessionDetail`)
