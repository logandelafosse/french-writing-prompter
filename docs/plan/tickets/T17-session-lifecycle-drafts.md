# T17 — Session lifecycle and draft autosave

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 1 | AFK | T16 | ~400 |

## User stories

- As Logan, I want my Draft saved as I write, so that closing the tab or reloading never costs me a paragraph.
- As Logan, I want to see when my Draft was last saved, so that I trust it.
- As Logan, I want to look at History mid-draft and come back to exactly where I was.

## What to build

**Server (backend S6, minus History and swap).**

- Generated migration adding `status` (`active | evaluated | abandoned`, default `active`), `prompt_level`, `writing_saved_at`, `evaluated_at`, `abandoned_at` to `sessions`, plus the idempotent backfill in backend §2.3 (newest row today stays `active`).
- `POST /api/prompt` stores `prompt_level` = the CEFR Level the prompt was generated for.
- **Defect D12**: evaluation writes the evaluated level to `cefr_level` only; `prompt_level` is never overwritten.
- `PUT /api/sessions/:id/draft` `{ text ≤ 20000 }` → `{ savedAt, wordCount }`; last write wins; `404 NOT_FOUND`, `409 NOT_ACTIVE` for evaluated or abandoned sessions. `\r\n` is normalised to `\n` before saving.
- Evaluate saves `writing_text` *before* calling the LLM (so an AI failure never loses text), then sets `status = evaluated`, `evaluated_at`. A second evaluate on the same session returns `409 ALREADY_EVALUATED`.
- `GET /api/today` `activeSession` now means the `active` daily session for today, and includes `draft: { text, savedAt } | null`.

**Client.**

- Autosave: debounced (~1.5 s) `PUT` on input, plus a flush on `visibilitychange` (hidden) and `pagehide` (`keepalive`/`sendBeacon`).
- localStorage mirror `draft:<sessionId>` = `{ text, savedAt }` on every change (throttled).
- Reconcile on load (implementation-map §4.7): newest `savedAt` wins; if local is newer, restore it and push it to the server. Local entries for sessions that are no longer active are removed.
- **DraftStatus**: `Brouillon sauvé à 21 h 42` (`{H} h {mm}`, local time), joined to the meter with ` · ` on desktop and on its own line on mobile. Keeps the last timestamp while saving. Not a live region. Offline/local copy is T19.

## Acceptance criteria

- [ ] [unit] DraftStatus uses the T06 time formatter and renders `Brouillon sauvé à 21 h 42`, `… 9 h 05`, `… 0 h 00`.
- [ ] [unit] `reconcileDraft(server, local)` picks the newer `savedAt`, handles either side missing, and flags when the server must be updated.
- [ ] [integration] Draft PUT saves text and `writing_saved_at`; PUT on an evaluated session returns 409 `NOT_ACTIVE`; unknown id returns 404; body over 20 000 chars returns 422.
- [ ] [integration] Evaluate with `FakeAiClient` failing still leaves `writing_text` saved and `status = active`.
- [ ] [integration] After evaluate, `prompt_level` equals the level used to generate and `cefr_level` equals the evaluated level (D12 regression test).
- [ ] [integration] Second evaluate on the same session returns 409 `ALREADY_EVALUATED`.
- [ ] [integration] Migration + backfill on a DB with legacy rows: evaluated rows become `evaluated`, others `abandoned`, the newest row today stays `active`; `evaluation_json` untouched.
- [ ] [e2e] 1280 px: type text, wait for `Brouillon sauvé à` with a time, reload → same text in Phase B and the same timestamp.
- [ ] [e2e] Type, navigate to `Historique`, come back to `/` → Phase B with the text intact.
- [ ] [e2e] Server draft older than localStorage copy (seeded): reload shows the local text, and a subsequent server read returns it.
- [ ] [e2e] 390 px: DraftStatus on its own line under the count.
- [ ] [check] `CONTEXT.md` defines **Draft** (unsubmitted Student Writing saved against an active session) with its `_Avoid_` terms.

## Tests to write first

- `draft status shows the saved time as "H h mm"`
- `reconcileDraft prefers the newest copy`
- `draft route rejects non-active sessions`
- `evaluate persists the text before the AI call`
- `evaluate never overwrites prompt_level`
- `backfill assigns statuses without touching evaluation_json`
- e2e `drafts.spec.ts` (reload, History round trip, local-newer) at 1280 and 390 px

## Out of scope

- Swap confirm, `abandoned` on replace, `displayStatus` derivation, quota-exhausted Phase B (T18).
- Offline DraftStatus `Brouillon gardé sur cet appareil` and AI error alert (T19).
- History redesign and per-row `dataIssues` (T31).
- Placement drafts (T33/T34).

## References

- `HANDOFF.md` → Home / Phase B (draft autosave), States.
- `implementation-map.md` §2.3 DraftStatus, §3.1 bootstrap resolution, §4.7, §4.8, §5 `draft.saved`, §7 slice 5.
- `backend-requirements.md` §0 D11, D12; §1 `SessionStatus`, `Draft`; §2.2; §2.3; §3 Prompts and sessions (draft + evaluate notes); §5 D11, D12; §7 S6.
