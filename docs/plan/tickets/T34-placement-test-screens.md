# T34 — Placement Test screens

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 4     | AFK  | T16, T33   | ~400                    |

## User stories

- As Logan on my first visit, I want a short Placement Test of three consignes that uses the same writing surface as Home, so that I get a CEFR Level from real writing rather than guessing.
- As Logan, I want a clear result with my level, one sentence on where I stand and one line per step, so that I understand the level before I start.
- As Logan, I want `Finir plus tard` to keep my place, so that I can stop mid-test and come back to the same step with my draft.

## What to build

`/placement` is a client state machine over the T33 API with three phases: `start`, `step` and `done`. The route is first-run only. When a level is already set, it redirects to `/`. The one exception is the result screen, which is shown from client state right after the final submit. The Home first-run link (T14) points here.

The header is reduced: the wordmark only, with no nav, quota or CEFR chip. On start it adds `Je connais mon niveau` → `/`, and on steps it adds `Finir plus tard` → `/`.

**Start.** h1 `Test de placement`. The intro reads `Trois consignes, une après l'autre. Écris ce que tu peux pour chacune. À la fin, je te donne ton niveau CECR et on commence pour de vrai.` An `<ol>` lists `Étape 1`–`3` (`Première consigne`, `Deuxième consigne`, `Troisième consigne`). The caption reads `Écris comme tu parles : le français de la Louisiane, c'est ça qui compte icitte. Tes brouillons sont gardés à mesure.` The `Commencer` button calls `POST /api/placement/start`. When `GET /api/placement` returns an in-progress run, `/placement` skips the start screen and opens the current step with its draft.

**Step.** h1 `Test de placement · étape {n} sur 3`, then a 3-segment progress bar with `role="progressbar"`, `aria-label="Avancement du test"`, `aria-valuemin=1`, `aria-valuemax=3`, `aria-valuenow={n}` and `aria-valuetext="Étape {n} sur 3"`. The sheet has the `CONSIGNE D'ÉCRITURE` prompt (no meta line, no swap), the same `RuledTextarea` labelled `TON TEXTE`, and a footer with the word count without a target (`{n} mots`), the draft status, `KbdHint`, and the primary button:

- The label is `Consigne suivante` on steps 1–2 and `Voir mon niveau` on step 3 (inferred, gap #32).
- The busy label is `Je lis ton texte…`.
- The button is disabled while the text is blank. ⌘/Ctrl+Enter submits.

Drafts autosave through T17 (server plus `localStorage`). An AI failure shows the T19 `ErrorAlert` with retry and leaves the text untouched.

**Done.** h1 `Test de placement · fini`, inside a Surface with `aria-live="polite"`:

- The level is large (96 px). The label reads `TON NIVEAU CECR · {LEVEL NAME}`, followed by the one-sentence summary.
- A `<dl>` holds one row per step: `Étape N`, the level, and that step's summary.
- The primary `Ma première consigne` lands on Home in the returning-learner phase. Per the mapping hint, it does not auto-generate.
- The text link `Choisir un autre niveau` goes to Home with the level menu open.

**Cleanup.** Delete `PlacementTestCard` and its mount.

## Acceptance criteria

- [ ] `[unit]` `PlacementProgress` exposes the progressbar role with the aria attributes above. Segments up to `n` are filled.
- [ ] `[unit]` The placement reducer moves start → step 1 → 2 → 3 → done, and a failed submit stays on the same step with the text intact.
- [ ] `[e2e]` At 1280 and 390 px, a first-run learner opens `/placement`, sees the start copy above, presses `Commencer`, and reaches `Test de placement · étape 1 sur 3` with the progress bar at 1.
- [ ] `[e2e]` A step shows `{n} mots` with no target zone and no `↻ Une autre consigne`. The button is disabled on blank text and reads `Voir mon niveau` on step 3.
- [ ] `[e2e]` Typing on step 2, reloading, and reopening `/placement` restores step 2 with the draft. `Finir plus tard` goes to `/` without losing the run.
- [ ] `[e2e]` Completing three steps with the fake client shows `Test de placement · fini`, the level, `TON NIVEAU CECR · SEUIL` for B1, and three `Étape N` rows. `Ma première consigne` lands on `/` with the CEFR chip showing that level and the quota at `Reste 3 consignes sur 3`.
- [ ] `[e2e]` With a level already set, `/placement` redirects to `/`.
- [ ] `[e2e]` The header on placement screens has no nav links, quota text or CEFR chip.
- [ ] `[e2e]` A fake evaluator failure on submit shows `role="alert"` with a retry button, and the textarea keeps its text.
- [ ] `[e2e]` axe reports no serious or critical violations on start, step and done at both widths.
- [ ] `[check]` `src/components/placement/placement-test-card.tsx` is deleted, and knip reports no unused placement exports.

## Tests to write first

- `PlacementProgress › progressbar aria values for step 2`
- `placement reducer › failed submit keeps step and text`
- `placement.spec › first run start to result at 1280 and 390`
- `placement.spec › reload resumes step and draft`
- `placement.spec › redirects when a level exists`

## Out of scope

- The server state, routes and results data: T33.
- Whether Placement Mistakes feed Weakness memory (Q8): the Weakness aggregation in T28 owns that filter.
- The bottom-sheet or other mobile-specific layouts beyond the fluid 390 px pass in T35.
- Auto-generating the first daily prompt from the result screen (gap #32 alternative). Not planned.
- A result screen on reload after completion: the learner lands on Home.

## References

- `HANDOFF.md` › Header (reduced header), Placement Test; `screens/PlacementStart.dc.html`, `PlacementStep.dc.html`, `PlacementDone.dc.html`
- `implementation-map.md` §2.9 (PlacementStart, PlacementProgress, PlacementStep, PlacementResult), §3.2, §3.3, §4.7 (placement drafts), §4.11, §5 › Placement copy, §6 gaps #10, #16, #32
- `backend-requirements.md` §3 › Placement Test
