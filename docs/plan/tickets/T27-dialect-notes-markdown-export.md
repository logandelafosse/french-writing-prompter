# T27 — Dialect Notes markdown export

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 2     | AFK  | T26        | ~120                    |

## User stories

- As Logan, I want my Dialect Notes and the base Louisiana rules exported to one markdown file, so that coding agents working on this repo know my dialect without querying the database.
- As Logan, I want the export committed after a session, so that changes to my dialect rules show up in git history.

## What to build

A pure renderer `renderDialectMarkdown(baseRules, notes)` produces `docs/dialect/louisiana-french.md`. The file contains, in order:

1. The generated header: `GÉNÉRÉ — modifier dans l'app (notes) ou dans src/modules/dialect/louisiana-rules.ts (règles de base)`.
2. A section of base rules from the single dialect module (T06).
3. Learner notes grouped under `Ce mot seulement` and `Toute la famille`, with stable heading anchors.

Each note shows its rule, example, learner form → tutor suggestion when present, and source date. Ordering is deterministic (by note id) and soft-deleted notes are excluded, so re-running with the same data produces a byte-identical file.

The same renderer serves two entry points:

- `npm run dialect:export` reads the DB at `DATABASE_URL` read-only and writes the file.
- `GET /api/dialect-notes/export` returns it as `text/markdown; charset=utf-8`.

Generate and commit the first `docs/dialect/louisiana-french.md` in this PR.

The app never reads the export back. The DB stays the runtime source of truth.

## Acceptance criteria

- [ ] `[unit]` The renderer output starts with the `GÉNÉRÉ` header and lists base rules, then word-scope notes, then pattern-scope notes.
- [ ] `[unit]` The renderer excludes notes with `deletedAt` set.
- [ ] `[unit]` Rendering the same input twice yields identical strings, and input order does not change the output.
- [ ] `[unit]` A note without `learnerForm`/`tutorSuggestion` (manual note) renders without the comparison line.
- [ ] `[integration]` `GET /api/dialect-notes/export` returns 200, `content-type: text/markdown`, and a body equal to the renderer output for the test DB's notes.
- [ ] `[integration]` The export script, run against a seeded test DB and a temp output path, writes the renderer output to that path.
- [ ] `[check]` `docs/dialect/louisiana-french.md` is committed and matches `npm run dialect:export` output at merge time.
- [ ] `[check]` An ast-grep rule forbids any `src/` module from reading `docs/dialect/` (no `fs` read of that path).
- [ ] `[check]` `CONTEXT.md`'s Louisiana French entry links to `docs/dialect/louisiana-french.md` instead of listing features inline. Skip this if T06 already did it.
- [ ] `[check]` `npm run check` passes. The production diff is under 500 lines, excluding the generated markdown.

## Tests to write first

- renderer: header, base rules, then notes grouped by scope
- renderer: excludes deleted notes
- renderer: deterministic output regardless of input order
- export route: returns markdown matching the renderer
- export script: writes the rendered file to the given path

## Out of scope

- `dialect:import` (markdown → DB): rejected for now (backend-requirements §6.1).
- Any UI button to download the export: not designed.
- Writing the file automatically on note save: forbidden (runtime repo writes).

## References

- `backend-requirements.md`: §3 Dialect Notes (`/export`), §4.1 module layout (`export-markdown.ts`), §4.4, §6.1 (full reasoning), §7 S14.
- `plan.md`: Product decisions (Dialect Notes storage).
- `docs/agents/tooling-review.md`: ast-grep rule conventions.
