# T20 — Level service with durable streak and undoable advancement

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 1     | AFK  | T14        | ~300                    |

## User stories

- As Logan, I want my progress toward the next CEFR Level to survive a server restart, so that three good Evaluations in a row actually move me up.
- As Logan, I never want an automatic "advancement" to move me down.
- As Logan, when I'm moved up, I want to see it once and be able to stay at my current level with one click.

## What to build

**Level service (backend §5 D5, slice S4).** Replace `CefrTracker`, `tracker-store.ts`, `initTracker` and the in-memory singleton with a stateless `level-service`:

- `getLevelState()`: current level from the latest `level_changes` row (`null` if none).
- Streak computed from the DB: trailing evaluated `daily` sessions after the latest level change whose evaluated `cefr_level` is above the current level, stopping at the first that isn't.
- `recordEvaluation()`: promote exactly one level when the streak reaches 3; no-op with no level set; never demotes; no-op at C2.
- `source` enum `manual | auto | placement | undo`; migration adds `reverts_change_id`.
- `PUT /api/level` → `manual`. `POST /api/level/undo { changeId }` inserts `{ from: to, to: from, source: "undo", revertsChangeId }`; `409 CONFLICT` unless the target is the latest change and `auto`; `404` if unknown. Manual and undo changes reset the streak implicitly.
- **D5 fixes**: delete the A2 seed in the evaluate route; evaluate with no level returns `400 NO_LEVEL`.
- **D6 fix**: placement completion calls `levelService.setLevel(level, "placement")`, not `db-store.setLevel(…, "manual")`.
- `GET /api/level` returns `{ level, history, streak }`.

**Banner.** `GET /api/today` `advancement` = the latest `auto` change if no session has been created since it (backend §3 Home: "clears on next generate"), so it survives a reload. The evaluate response's `advancement` shows it immediately.

**AdvancementBanner** (`States.dc.html`): Notice `advance` tone, `role="status"`: `**Te voilà en {to}.** Tes dernières évaluations étaient au-dessus de {from}, ça fait que les consignes vont monter d'un cran.` + quiet-ink `Rester en {from}`. Undo calls the endpoint, hides the banner and updates the header chip. Generating the next prompt clears it. It sits above the sheet on Home.

## Acceptance criteria

- [ ] [unit] Streak table: three above-level evaluations after the last change → promote; a below/at-level evaluation in between resets; changes after an evaluation exclude earlier sessions; placement sessions are ignored.
- [ ] [unit] Learner at C1 receiving three B1 Evaluations stays at C1 (demotion regression, D5).
- [ ] [unit] No level set → `recordEvaluation` does nothing; at C2 nothing promotes.
- [ ] [integration] Streak survives a fresh service instance (no module state): two evaluations, new instance, third evaluation → promotion.
- [ ] [integration] Undo: inserts an `undo` row with `reverts_change_id`, level back to `from`, streak 0; undo on a `manual` change or a non-latest change → 409.
- [ ] [integration] Evaluate with no level → 400 `NO_LEVEL`; nothing written to `level_changes`.
- [ ] [integration] Placement completion writes a `placement` change.
- [ ] [integration] `/api/today` returns `advancement` after an auto change and `null` once a later session exists.
- [ ] [e2e] 1280 px, seeded with two above-level evaluations at B1: third submit (fake AI returns B2) → banner `Te voilà en B2.`, chip `B2 ▾`; reload → banner still shown; `Rester en B1` → banner gone, chip `B1 ▾`.
- [ ] [e2e] Banner present, then `Donne-moi une consigne` → banner gone and stays gone after reload.
- [ ] [e2e] 390 px: banner wraps, undo link ≥ 44 px tall. axe clean.
- [ ] [check] `tracker-store.ts`, `initTracker` and the `CefrTracker` singleton are deleted; nothing imports them.

## Tests to write first

- `computeStreak counts trailing above-level evaluations since the last change`
- `recordEvaluation promotes one level at three and never demotes`
- `level state is rebuilt from the DB on every call`
- `undo reverts only the latest auto change`
- `evaluate without a level returns NO_LEVEL`
- `advancement banner clears after the next generated prompt`
- e2e `advancement.spec.ts` at 1280 and 390 px

## Out of scope

- Persistent Placement runs (T33); the placement route only switches its level write here.
- History's level progression line (T31).
- Level menu UI (T13).

## References

- `HANDOFF.md` → States (level advancement).
- `screens/States.dc.html`.
- `implementation-map.md` §2.5 AdvancementBanner, §3.1 `advancement`, §4.9, §5 States (`advance.*`), §6 items 46, 47, §7 slice 16.
- `backend-requirements.md` §0 D5, D6; §2.2 `level_changes`; §3 Home (`banner`), Level; §5 D5 level service, D6; §7 S4.
- `CONTEXT.md` example dialogue (three consecutive Evaluations above the current level).
