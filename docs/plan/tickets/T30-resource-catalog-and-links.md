# T30 — Resource catalog and links

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 3 | HITL (Q7) | T28 | ~200 (excluding catalog data) |

**Owner question Q7:** What goes in the Resource catalog? **Default if accepted:** the implementer drafts a starter catalog of well-known free French grammar and comprehensible-input sources, and Logan edits it in the PR before merge.

## User stories

- As Logan, I want each Faute to link to one grammar explanation (`Grammaire · …`) and one listening or reading source (`Input · …`), so that I can go learn the rule right away.
- As Logan, I want the same two links on active Weaknesses in the Carnet, so that I know where to practise.
- As Logan, I want every link to come from a list I approved, so that the tutor never invents a URL.

## What to build

`src/modules/resources/catalog.data.ts` holds the curated catalog, validated by the `Resource` Zod schema (backend-requirements §1): id, `type` (`grammaire` | `input`), French `title`, `url`, `source`, `categories`, `dialect`.

- Every Mistake category, `autre` included, has at least one `grammaire` and one `input` entry.
- The catalog stays under 60 entries.
- The implementer drafts entries from well-known free sources, checks by hand that each URL resolves, and lists them in the PR body for Logan's review.

**Evaluator.** The evaluator prompt injects `{ id, type, title, categories }` and tells the model to pick at most one `grammaire` and one `input` ID for each Mistake, in its category, and never to invent an ID or URL. The post-processor keeps only IDs that exist and are tagged with the Correction's category. If no valid ID is left for a type, it fills that type with the first catalog entry of that type for the category.

A single function `resourcesFor(category, ids)` resolves links. Corrections stored before this ticket (empty `resourceIds`) get category defaults at read time, with no backfill.

**ResourceLinks.** Shown on Mistake cards (including converted dialect checks) and on Carnet Weakness rows whose trend is `actif` or `en progrès`. `tranquille` rows show none, as in the mockup.

- Labels: `Grammaire · {title}` and `Input · {source}`.
- Links open in a new tab with `rel="noopener"` and visually hidden ` (nouvel onglet)`.
- Minimum height is 32 px on desktop and 44 px on mobile (implementation-map §6 gap 39).
- Layout is a row on desktop cards and the Carnet, and a column on mobile cards.
- `standard` and `dialect_check` cards never show Resources.

## Acceptance criteria

- [ ] `[unit]` Every catalog entry parses with `Resource`. IDs are unique. Every Mistake category has ≥1 `grammaire` and ≥1 `input`. The total is under 60.
- [ ] `[unit]` The post-processor drops an invented ID and an ID from another category, then fills from category defaults so each Mistake has exactly one of each type.
- [ ] `[unit]` The post-processor leaves `resourceIds` empty on `standard` and open `dialect_check` Corrections.
- [ ] `[unit]` `resourcesFor` returns category defaults when the stored IDs are empty.
- [ ] `[unit]` The evaluator prompt builder lists every catalog ID with its type and categories, and includes no URLs.
- [ ] `[integration]` The Home bootstrap and `GET /api/weaknesses` return resolved `{ id, type, label, url }` links. Weaknesses get links only for `actif` and `en_progres`.
- [ ] `[e2e]` A Mistake card shows exactly one `Grammaire · …` and one `Input · …` link, each with `target="_blank"`, `rel` containing `noopener`, and the hidden `(nouvel onglet)` text. A `standard` card shows none. Check at 1280 px and 390 px.
- [ ] `[e2e]` When the fake evaluator output names an invented resource ID, the card still shows valid catalog links.
- [ ] `[e2e]` On `/carnet`, an `actif` row shows two Resource links and a `tranquille` row shows none. At 390 px each link is at least 44 px tall.
- [ ] `[check]` `npm run check` passes. The production diff is under 500 lines, excluding `catalog.data.ts`.

## Tests to write first

- catalog: schema, unique ids, coverage per category
- post-processor: replaces invalid resource ids with category defaults
- post-processor: no resources on standard or dialect checks
- resourcesFor: defaults for legacy Corrections
- evaluator prompt: lists catalog ids without URLs
- review e2e: two resource links per Faute, none on standard
- carnet e2e: links on active rows only

## Out of scope

- Per-Mistake matching beyond category: rejected by design.
- Fetching or validating URLs over the network in tests: no network in CI.
- Louisiana-specific input sources beyond what Logan adds in review.

## References

- `HANDOFF.md`: Correction (Resources), Carnet.
- `implementation-map.md`: §2.4 ResourceLinks, §2.7 CarnetWeaknessRow, §4.3 `ResourceLink`, §5 CorrectionCard copy, §6 gaps 5, 39.
- `backend-requirements.md`: §1 `Resource`, §1.1 taxonomy, §4.1 module layout, §4.2 prompt item 5 and post-processing item 4, §7 S10.
- `plan.md`: Q7.
- Screens: `Corrections.dc.html` (left column), `HomeReview.dc.html`, `MobileReview.dc.html`, `Carnet.dc.html`.
