# T26 — Carnet page with Dialect Notes list

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 2     | AFK  | T25        | ~320                    |

## User stories

- As Logan, I want to see all my Dialect Notes in the Carnet under `Mon français louisianais`, so that I can check what the tutor has learned about how I speak.
- As Logan, I want to fix (`Modifier`), remove (`Supprimer`), or add (`Ajouter une note`) a note myself, so that the tutor follows rules I actually agree with.

## What to build

A `/carnet` route (`max-width: 860px`) with the h1 `Carnet`. The header nav link `Carnet` gets `aria-current="page"`. This ticket ships one Surface: `Mon français louisianais`. Its header holds the intro `Tes notes de dialecte. Le tuteur les suit et te reprend pas là-dessus.` and an outline-dialect `Ajouter une note` button.

Each `DialectNoteRow` shows:

- the rule (`lang="fr"`, Newsreader 20 px)
- the example in italics
- the meta line `{date} · {source} · {scope}`:
  - source: `séance d'aujourd'hui` / `séance du 9 novembre`, omitted for manual notes
  - scope: `ce mot seulement` / `toute la famille`
  - ` · nouvelle` in `dialect` color for notes created in the last 24 hours (assumption for §6 gap 29)
- `Modifier` and `Supprimer`

Rows are listed newest first. Soft-deleted notes are never listed.

`GET /api/dialect-notes`, `PATCH /api/dialect-notes/:id` and `DELETE /api/dialect-notes/:id` (soft delete) are added. `DialectNoteSheet` from T25 gains two modes:

- **`new`:** no comparison row. It adds a `Le mot ou la tournure` text input (inferred) that fills `form`, and generic scope labels `Ce mot seulement` / `Toute la famille`.
- **`edit`:** titled `Modifier la note` (inferred), pre-filled, and saved through PATCH.

`Supprimer` opens an inline `role="alertdialog"` confirm in the row, following the swap-confirm pattern. Its copy is inferred: `Supprimer cette note ? Le tuteur pourra te reprendre là-dessus.`, with `Garder` (focused on open, and Escape does the same) and `Supprimer`. A deleted note stops being injected into the evaluator and stops suppressing Corrections. Past `overturned` Corrections stay overturned.

Empty state (inferred copy): `Pas encore de notes. Quand le tuteur te demande « Ça se dit comme ça ? », ta réponse vient icitte.`

## Acceptance criteria

- [ ] `[unit]` The note meta formatter renders `14 novembre · séance d'aujourd'hui · ce mot seulement · nouvelle` for a note from today's session, and omits the source for a manual note.
- [ ] `[unit]` `nouvelle` is shown for a note created 23 h ago and hidden for one created 25 h ago.
- [ ] `[integration]` `GET /api/dialect-notes` returns active notes newest first and excludes soft-deleted ones.
- [ ] `[integration]` `PATCH` updates the rule, example, scope and form, and bumps `updatedAt`. It returns 404 for unknown or deleted ids and 422 for a rule under 3 chars.
- [ ] `[integration]` `DELETE` returns 204 and sets `deletedAt`. The next evaluator prompt no longer lists that note.
- [ ] `[e2e]` A note saved from a review (T25 flow) appears in `/carnet` with its rule, example and the `nouvelle` tag. Check at 1280 px and 390 px.
- [ ] `[e2e]` `Ajouter une note` opens the sheet without the `T'as écrit` row. Saving adds a row without a source.
- [ ] `[e2e]` `Modifier` opens `Modifier la note` pre-filled. Changing the rule and saving updates the row.
- [ ] `[e2e]` `Supprimer` asks for confirmation with focus on `Garder`. Escape keeps the note. Confirming removes the row, and it stays gone after a reload.
- [ ] `[e2e]` With no notes, the empty-state line is shown. axe reports no violations on `/carnet`.
- [ ] `[check]` `npm run check` passes. The production diff is under 500 lines.

## Tests to write first

- note meta: today's session note with nouvelle tag
- note meta: manual note omits source
- dialect-notes routes: list excludes deleted, patch validates, delete is soft
- evaluator prompt: deleted note no longer injected
- carnet e2e: saved note appears with nouvelle
- carnet e2e: add, edit, delete with confirm

## Out of scope

- `À travailler` section: T28.
- Markdown export: T27.
- Restoring deleted notes or undo after delete: not planned.

## References

- `HANDOFF.md`: Carnet, Add Dialect Note sheet.
- `implementation-map.md`: §2.6 (modes), §2.7 DialectNoteRow, §4.4, §5 Carnet and DialectNoteSheet copy, §6 gaps 16, 29, 31.
- `backend-requirements.md`: §1 `DialectNote`, §2.2 `dialect_notes.deletedAt`, §3 Dialect Notes, §6.1.
- Screens: `Carnet.dc.html` (second section), `DialectNote.dc.html`, `States.dc.html` (swap confirm pattern).
