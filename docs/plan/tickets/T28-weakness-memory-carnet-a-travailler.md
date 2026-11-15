# T28 — Weakness memory and Carnet "À travailler"

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 3     | AFK  | T22, T26   | ~300                    |

## User stories

- As Logan, I want the Carnet to list the Fautes that keep coming back under `À travailler`, each with how often and when I last made it, so that I know what to practise.
- As Logan, I want each Weakness marked `actif`, `en progrès` or `tranquille`, so that I can see whether I'm improving.

## What to build

Weaknesses are derived from Corrections, never stored. A Mistake is whatever `countsAsMistake` says it is:

- Mistakes that weren't pushed back count.
- Dialect checks answered `Non, corrige-le` count.
- `standard` Corrections, overturned Mistakes, and open or confirmed dialect checks never count.

A `weakness-service` aggregates by Mistake category (the §1.1 taxonomy from T21) over all evaluated sessions of any kind. Placement counts too, per the Q8 default. For each category it computes the all-time `count`, `lastSeenAt` (evaluation time of the latest session with one), `s`, and `trend` using the deterministic rule in backend-requirements §1.2: the window is the last 5 evaluated sessions, and the rule is a pure `computeTrend`. Categories with count 0 are not listed. Ordering is by trend (actif → en progrès → tranquille), then `s` desc, then count desc.

`GET /api/weaknesses` returns `{ weaknesses }`.

The Carnet gets an `À travailler` Surface above `Mon français louisianais`, with the intro `Les fautes qui reviennent. « Pratiquer ça » oriente ta prochaine consigne.`. Each `CarnetWeaknessRow` has `id="weakness-<category>"`, an h3 with the category label, and the meta line `{n} fois · vu {when} · {trend}`:

- `1 fois` in the singular.
- `when` is `aujourd'hui` or `le 6 novembre`, in learner-local time from the dates module.
- `tranquille` rows use ink-2 for the title and muted for the meta.

Empty state (inferred copy): `Rien à travailler pour l'instant. Les fautes qui reviennent vont apparaître icitte.`

## Acceptance criteria

- [ ] `[unit]` `computeTrend` table: latest session has one → `actif`; 2+ of last 5 without the latest → `actif`; exactly 1, not latest → `en_progres`; 0 in window but ≥1 all-time → `tranquille`; fewer than 5 sessions uses what exists.
- [ ] `[unit]` Aggregation counts a `confirmed_mistake` dialect check and ignores `standard`, `overturned`, open `dialect_check` and `confirmed_dialect`.
- [ ] `[unit]` Ordering puts `actif` before `en_progres` before `tranquille`, then by `s` desc, then by count desc.
- [ ] `[unit]` The meta formatter renders `1 fois · vu aujourd'hui · actif` and `3 fois · vu le 6 novembre · en progrès`.
- [ ] `[integration]` `GET /api/weaknesses` against a seeded test DB returns only categories with count ≥ 1, with correct counts and trends.
- [ ] `[integration]` Q8 default: Mistakes from a `kind = 'placement'` session count toward their category. The inclusion is one named filter, so a "no" from Logan is a one-line change. If T33 has not landed yet, seed a placement-kind session directly.
- [ ] `[integration]` Overturning a Mistake through `POST /api/dialect-notes { fromCorrectionId }` lowers that category's count by one.
- [ ] `[e2e]` After two fake evaluations (one Mistake in `genre` each, plus a `standard` Correction and a pushed-back Mistake in `accents`), `/carnet` shows `Genre des noms` with `2 fois · vu aujourd'hui · actif`, and no row for the pushed-back category. Check at 1280 px and 390 px.
- [ ] `[e2e]` Answering `Non, corrige-le` on a dialect check adds its category to `À travailler`.
- [ ] `[e2e]` A new learner sees the empty-state line. axe reports no violations on `/carnet`.
- [ ] `[check]` `npm run check` passes. The production diff is under 500 lines.

## Tests to write first

- computeTrend: table of window cases
- weakness aggregation: only countsAsMistake Corrections count
- weakness ordering: trend, then s, then count
- weakness meta: singular and dated forms
- weaknesses route: lists seeded categories with trend
- carnet e2e: Mistakes appear, standard and pushed-back do not

## Out of scope

- Focus du jour, the `focus du jour` meta, and `Pratiquer ça`: T29.
- Resource links on rows: T30.
- History titles by Focus: T31.

## References

- `HANDOFF.md`: Carnet.
- `implementation-map.md`: §2.7 CarnetPage, CarnetWeaknessRow. §4.3. §5 Carnet copy. §6 gaps 4, 6, 31.
- `backend-requirements.md`: §1 `countsAsMistake`, `Weakness`. §1.1 taxonomy. §1.2 trend rule. §3 Weaknesses and Carnet.
- `plan.md`: Q8 default (Placement feeds memory).
- Screens: `Carnet.dc.html` (first section).
