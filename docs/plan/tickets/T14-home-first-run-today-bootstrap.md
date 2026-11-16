# T14 — Home first run and `/api/today` bootstrap

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 1     | AFK  | T13        | ~380                    |

## User stories

- As Logan on my first visit, I want to pick my CEFR Level and get a Writing Prompt in one step, so that I start writing right away.
- As Logan, if I'm unsure of my level, I want an obvious way to take the Placement Test instead.
- As Logan returning later today, I want Home to open in the right state (ready to generate, or back on today's prompt) after one load.

## What to build

`/` becomes a thin wrapper around a client `HomePage` that owns the Home state machine (implementation-map §3.1). This ticket ships phases `A0-first-run` and `A-ready`, and the transition into `B-writing`. It replaces `LevelCard` and the generate half of `PromptCard` on `/`.

- **Bootstrap**: `GET /api/today` returns `{ level, levelName, quota, focus, activeSession, advancement }` validated by a zod response schema (implementation-map §4.13; backend §3 calls the same contract `GET /api/home`, use `/api/today`). In this ticket `focus` is always `[]` and `advancement` is always `null` (filled by T29 and T20). `activeSession` is the latest `daily` session with today's local date and no Evaluation, else `null`. The client resolves: no level → A0; active session → B; else → A-ready. Evaluated sessions resolve to A-ready until T22 adds Phase C restore.
- **Title**: today's date in French, first letter capitalised (`Samedi 14 novembre`); on mobile, weekday and date on two lines.
- **A0 (HomeEmpty)**: `FirstRunIntro` in a Surface with `Bienvenue. Icitte, on écrit un petit texte par jour, en français de la Louisiane.` (no name: there is no profile, implementation-map §6.8) and `Pour te donner une consigne à ta mesure, il me faut ton niveau. Tu pourras le changer n'importe quand.` Then `LevelPicker`: `<fieldset>` + legend `Ton niveau CECR` (uppercased by CSS), six `<button aria-pressed>` options with code + French name. Primary `Donne-moi une consigne` is disabled until a level is pressed (§6.34). Secondary link `Pas sûr ? Fais le test de placement (3 consignes)` to `/placement`.
- **A0 → B**: `PUT /api/level` then `POST /api/prompt`; the header chip appears and quota decrements.
- **A-ready (desktop not drawn, §6.15)**: date title, a Surface with one short line and `Donne-moi une consigne`. Mobile uses full-width 54 px button. Generate is disabled at `remaining: 0` (full notice in T18).
- **B (interim)**: shows the prompt text and keeps today's existing writing + submit flow working until T15/T16 replace it. No regression of submit/evaluate.
- **`/placement` route (interim)**: mounts the existing `PlacementTestCard` under the T13 placement header variant with `Je connais mon niveau` → `/`. Visiting `/placement` with a level set redirects to `/`. T34 redesigns it.

## Acceptance criteria

- [ ] [unit] Phase resolver: `{level:null}` → A0; level + activeSession → B; level + no session → A-ready; level + evaluated-only session → A-ready.
- [ ] [integration] `GET /api/today` returns the documented shape for a fresh DB, a DB with a level only, and a DB with today's unevaluated session; yesterday's session is never `activeSession`.
- [ ] [unit] `LevelPicker` exposes six buttons with `aria-pressed`, exactly one true after a click; the legend labels the group.
- [ ] [e2e] First run at 1280 and 390 px: welcome copy, six level buttons, `Donne-moi une consigne` disabled; press `B1` → enabled; click → prompt text visible, chip `B1 ▾`, quota `Reste 2 consignes sur 3`.
- [ ] [e2e] Placement link navigates to `/placement`, which shows the reduced header (wordmark + `Je connais mon niveau`, no nav/quota/chip).
- [ ] [e2e] Returning with a level and no session today: date title and `Donne-moi une consigne`, no level picker.
- [ ] [e2e] Reload after generating: lands back on today's prompt (Phase B), quota unchanged.
- [ ] [e2e] Submitting from interim Phase B still produces an Evaluation (existing scores render). axe clean on A0 and A-ready.
- [ ] [check] `LevelCard` is no longer imported by `/`; `page.tsx` makes one bootstrap fetch.

## Tests to write first

- `resolveHomePhase maps bootstrap states to A0, A-ready and B`
- `today route returns level, quota and only today's unevaluated session`
- `level picker toggles aria-pressed and enables generate`
- `first-run generate sets the level then creates a prompt` (component test with mocked fetch)
- e2e `home-first-run.spec.ts`, `home-returning.spec.ts` at 1280 and 390 px

## Split note (2026-11-15)

[PR #60](https://github.com/logandelafosse/french-writing-prompter/pull/60) = **618** production lines. Deliver as **T14a** then **T14b**: [`T14a-today-api-bootstrap.md`](T14a-today-api-bootstrap.md), [`T14b-home-phases-ui.md`](T14b-home-phases-ui.md).

## Out of scope

- PromptSheet, meta line, generate busy label, fade-up (T15).
- Ruled textarea, word meter, Phase C (T16, T22).
- Draft restore and session statuses (T17, T18).
- Focus line content (T29); advancement banner (T20); Placement redesign (T34).

## References

- `HANDOFF.md` → Home / Phase A; `screens/HomeEmpty.dc.html`, `screens/MobileEmpty.dc.html` (layout only; Focus hero is T29).
- `implementation-map.md` §2.3 (HomePage, LevelPicker, FirstRunIntro), §3.1, §3.3 first two transitions, §4.13, §5 Home / Phase A, §6 items 8, 15, 17, 34, §7 slice 3.
- `backend-requirements.md` §3 Home and state (`GET /api/home`), §3 conventions (`NO_LEVEL`).
