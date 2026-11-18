# T31 — History redesign

GitHub issue: #33

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 4     | AFK  | T18, T22   | ~420                    |

## User stories

- As Logan, I want each past session in the Historique titled by what I was working on, with its date, status and Mistake count, so that I can find a session without rereading prompts.
- As Logan, I want to expand an evaluated session and see the prompt, an excerpt of my text and a summary of the Corrections by kind, so that I can recall what went wrong without opening the full review.
- As Logan, I want one broken session to show a calm notice in its own row, so that a bad record never blanks the whole Historique.

## What to build

`GET /api/sessions` becomes defensive. Every row goes through the stored-JSON schemas with `safeParse` (`parseStoredEvaluation`, `PromptMeta`, the Focus snapshot), and any failure becomes a `dataIssues` entry on that row's `SessionSummary` instead of an exception. The response also carries `levelLine`, built from `level_changes`. The route accepts `limit`/`cursor` as in the contract; the page asks for the first 50 rows.

The page moves to `/historique`. `/history` (and `/history/:path*`) redirects permanently to the French slug, and the header nav link `Historique` points at `/historique` with `aria-current="page"`. The page has h1 `Historique`, the quiet level line `Niveau : A2 depuis le 3 octobre, B1 depuis le 28 octobre.` (omitted when there are no level changes), and a list labelled `Séances passées`.

Each row is a `HistoryRow` wrapped in its own error boundary:

- **Evaluated**: filled dot, title in weight 600. The title is the Focus labels joined with `·`. Fallback when there is no Focus snapshot: `{genre} · {date}` from prompt meta, else `Séance du {date}`. Never the prompt text. Meta reads `{Weekday d month} · évaluée · {n} fautes · {level}`, where the Mistake count uses `countsAsMistake`.
- **Draft abandoned**: hollow dot, weight 500, title `Brouillon laissé de côté`, meta `{date} · {n} mots · pas évalué`. When expanded it shows the prompt and a draft excerpt, with no Corrections block and no link.
- **Prompt unused**: short dash, weight 400, title `Consigne pas utilisée`, meta `{date} · rien d'écrit`. Rendered as a `<div>`, not expandable.
- **Malformed**: meta ends with `· détails incomplets`. The expanded body is the inline Notice `Les corrections de cette séance ont pas pu être relues. Ta consigne et ton texte sont gardés, et le reste de l'Historique marche comme d'habitude.` The row still shows whatever fields did parse.
- **Legacy v1 Evaluation**: meta shows `Évaluation d'avant les corrections` instead of a count; no Corrections block.

An expanded evaluated row has three blocks. `CONSIGNE D'ÉCRITURE` with the prompt. `TON TEXTE · {n} MOTS` with an excerpt (the first ~3 sentences, ending in `…`); T32 adds the link `Lire tout le texte avec ses marques` under it. `CORRECTIONS` with one line per item: `Faute` shows the struck quote → suggestion, `Français standard` shows quote → suggestion, and `Note de dialecte` shows `{quote}, gardé comme t'as écrit`.

Today's in-progress session stays on Home and is not listed. Dates use a shared French formatter with the weekday capitalised (`Samedi 14 novembre`).

## Acceptance criteria

- [ ] `[integration]` `GET /api/sessions` returns 200 with one row per session when the DB has a row with `evaluation_json = '{"score": 5}'`, a row with `prompt_constraints = '{}'`, and a v1 row. Their `dataIssues` are `evaluation_unreadable`, `prompt_meta_unreadable` and `evaluation_legacy` respectively.
- [ ] `[integration]` `displayStatus` is `evaluated`, `draft_abandoned` or `prompt_unused` per the table in `backend-requirements.md` §3, and today's `in_progress` session is excluded.
- [ ] `[unit]` The title helper returns joined Focus labels, then `{genre} · {date}`, then `Séance du {date}`, and never returns any substring of the prompt text.
- [ ] `[unit]` `mistakeCount` counts only `countsAsMistake` Corrections. Overturned Mistakes and Standard→Louisiana suggestions are excluded. The meta reads `0 faute`, `1 faute`, `2 fautes`.
- [ ] `[unit]` `levelLine` renders `Niveau : A2 depuis le 3 octobre, B1 depuis le 28 octobre.` from two level changes, and is null with none.
- [ ] `[unit]` A row whose render throws shows the inline Notice. Its sibling rows still render.
- [ ] `[e2e]` At 1280 and 390 px, the seeded list shows all three statuses plus a malformed row, with the exact titles and meta copy above. The status words `évaluée`, `pas évalué` and `rien d'écrit` are present as text, and the glyphs are `aria-hidden`.
- [ ] `[e2e]` Activating an evaluated row's header button toggles `aria-expanded`. The expanded region (referenced by `aria-controls`) shows the three blocks, and the link points to `/historique/{id}`.
- [ ] `[e2e]` The prompt-unused row has no button and cannot be expanded.
- [ ] `[e2e]` Visiting `/history` lands on `/historique` with a 308 status.
- [ ] `[e2e]` At 390 px there is no horizontal scroll, the Surface padding is 22px 18px, and the expanded indent is 0 (gap #16).
- [ ] `[e2e]` axe reports no serious or critical violations on `/historique` at either width.
- [ ] `[check]` `src/components/history/history-page.tsx` is deleted, and no client code calls `JSON.parse` on a DB string.

## Tests to write first

- `sessions route › malformed evaluation row yields evaluation_unreadable and still lists the prompt`
- `sessions route › derives display status for abandoned and unused sessions`
- `historyTitle › never falls back to the prompt text`
- `levelLine › joins level changes in French`
- `HistoryRow › one throwing row does not blank the list`
- `historique.spec › three statuses and malformed notice at 1280 and 390`
- `historique.spec › /history redirects to /historique`

## Out of scope

- The full marked-up view at `/historique/[id]` and the `Lire tout le texte avec ses marques` link to it: T32. Do not render the link in this ticket.
- Titles by Focus: they appear once T29 snapshots Focus onto sessions. Until then the fallback titles apply.
- Placement sessions in the list: excluded here (`kind = 'daily'` only). Revisit after T33.
- Pagination UI and the empty-state design (gap #31). If the list is empty, show one line, `Pas encore de séance.` (inferred copy).
- Deleting other legacy components: T35.

## References

- `HANDOFF.md` › History; `screens/History.dc.html`
- `implementation-map.md` §2.8 (HistoryPage, HistoryRow), §3 routes, §4.8 (HistoryItem), §5 › History copy, §6 gaps #9, #16, #27, #31, #48
- `backend-requirements.md` §2.3 (malformed rows, v1 legacy), §3 › Prompts and sessions (`SessionSummary`, `displayStatus`, `levelLine`), §5 D13, §7 S6
