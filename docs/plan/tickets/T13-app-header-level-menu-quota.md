# T13 — App header, level menu, local-midnight quota

| Phase | Type              | Blocked by    | Production lines (est.) |
| ----- | ----------------- | ------------- | ----------------------- |
| 1     | AFK (Q3 answered) | T06, T10, T11 | ~420                    |

**App name (Q3, answered 2026-11-15):** this writing tutor is **Consigne**, a practice mode under the product **Louisiana Languages** (`../LouisianaFrench`). Wordmark: `Consigne`. Browser tab / metadata title: `Consigne · Louisiana Languages`. Tagline under the wordmark: `atelier d'écriture · français louisianais` (or `Louisiana Languages · français louisianais` if that fits the header better — keep the first unless the layout needs the product name in the tagline). Name and product attribution live in one constant module so a rename is a one-line change.

## User stories

- As Logan, I want the header to show how many Writing Prompts I have left today, so that I know whether I can still practise before bed.
- As Logan, I want the quota to reset at my local midnight, not at 18:00 (UTC midnight), so that "today" means my day.
- As Logan, I want to change my CEFR Level from the header chip, so that I don't need a separate settings screen.

## What to build

One `AppHeader` rendered from the root layout, replacing the ad-hoc `<h1>French Writing Prompter</h1>` + History link in `src/app/page.tsx` and the Back link in `history-page.tsx`.

- **Full variant**: wordmark (links to `/`) with tagline `atelier d'écriture · français louisianais`, `<nav aria-label="Navigation">` with `Historique` (to the existing History route; `aria-current="page"` when on it), `QuotaText`, and `LevelChip`. The `Carnet` nav link is added by T26 when `/carnet` exists; do not ship a dead link.
- **Mobile (< 640 px)**: two rows. Row one wordmark (26 px, no tagline) + chip; row two nav + compact quota.
- **Placement variant**: wordmark only plus an optional right-side text link (`Je connais mon niveau` / `Finir plus tard`). Built and unit-tested here; first mounted on a route in T14.
- **First run** (no CEFR Level): no chip; quota reads `3 consignes aujourd'hui`.
- **QuotaText** copy (implementation-map §5 AppHeader): `Reste N consignes sur 3`, singular `Reste 1 consigne sur 3`, exhausted `3 consignes sur 3 prises`; compact `Reste N sur 3` / `3 sur 3 prises`. Plain text, not a live region. It updates after a prompt is generated without a page reload.
- **LevelChip + LevelMenu**: chip `B1 ▾` with `aria-label="Niveau CECR B1, changer"`; opens a Base UI Menu of six `menuitemradio` options `A1 · Découverte` … `C2 · Maîtrise` (current one checked). Escape closes and returns focus to the chip; arrow keys move. Choosing calls `PUT /api/level` with `{ level }` only (no client `source`, backend-requirements §3 Level). `LEVEL_LABELS` become French.
- **Quota server side (backend S5, defect D8)**: add `kind` and `local_date` columns to `sessions` via a generated migration plus idempotent backfill (backend §2.3). Quota = count of `kind='daily'` sessions for today's local date, using the T06 local-dates module (`APP_TIME_ZONE` fallback to system zone). Check-and-insert happens in one transaction in `POST /api/prompt`. `GET /api/quota` returns `{ used, remaining, max: 3, resetsAt }` where `resetsAt` is the ISO instant of the next local midnight. Drop `daily_quota` and `quota-store.ts`.

## Acceptance criteria

- [ ] [unit] `QuotaText` renders each copy form above for remaining 3, 2, 1, 0, first run, and compact.
- [ ] [unit] Local date key and `resetsAt` are correct around midnight in `America/Chicago`, including a DST transition day (23:59 vs 00:01 local; 18:30 local is still "today").
- [ ] [integration] With three daily sessions on today's local date, `POST /api/prompt` returns 429 `QUOTA_EXHAUSTED` with `resetsAt`; sessions from yesterday's local date do not count.
- [ ] [integration] Two concurrent `POST /api/prompt` calls at `remaining: 1` create exactly one session.
- [ ] [integration] `PUT /api/level` with a `source` field is rejected (422); with `{ level }` it records a `manual` change.
- [ ] [integration] Migration applies to a DB created from the previous schema; backfill fills `local_date` and `kind` without touching `evaluation_json`.
- [ ] [unit] Placement variant renders wordmark + the given link and no nav, quota or chip.
- [ ] [e2e] 1280 px: header shows wordmark, tagline, `Historique`, `Reste 3 consignes sur 3`, and `B1 ▾`; generating a prompt changes the quota text to `Reste 2 consignes sur 3` without reload.
- [ ] [e2e] 390 px: two rows; compact quota `Reste N sur 3`; no tagline.
- [ ] [e2e] First run (no level): no chip; quota reads `3 consignes aujourd'hui`.
- [ ] [e2e] Keyboard: open the chip, arrow to `C1 · Autonome`, Enter; chip reads `C1 ▾`; reopen, Escape closes and focus is back on the chip. axe reports no violations.
- [ ] [check] `daily_quota` and `quota-store.ts` are gone; the app name appears in exactly one constant.

## Tests to write first

- `quotaText renders remaining, singular, exhausted, first-run and compact forms`
- `localDateKey and nextLocalMidnight respect APP_TIME_ZONE across midnight and DST`
- `prompt route refuses a fourth daily prompt on the same local date`
- `concurrent prompt requests never exceed the daily max`
- `level PUT rejects client-supplied source`
- `level menu selects a level with the keyboard and restores focus on Escape` (Testing Library)
- e2e `header-quota.spec.ts`, `level-menu.spec.ts` at 1280 and 390 px

## Out of scope

- New Home phases and the `/api/today` bootstrap (T14).
- Quota-exhausted notice, countdown and disabled swap (T18).
- Streak reset and level undo semantics (T20).
- `Carnet` nav link (T26); `/historique` rename (T31).

## References

- `HANDOFF.md` → Components and behavior → Header; Design tokens.
- `implementation-map.md` §2.2 Shell (AppHeader, QuotaText, LevelChip/LevelMenu), §4.10, §5 AppHeader copy, §6 items 1, 14, 17, 45, §7 slice 2.
- `backend-requirements.md` §0 D8, §2.2 (`kind`, `local_date`, `sessions_quota_idx`), §2.3, §3 conventions + Level, §5 D8, §7 S5.
- `plan.md` Q3.
