# T23 — Standard→Louisiana suggestions

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 2 | AFK | T22 | ~150 |

## User stories

- As Logan, when I write correct Standard French, I want the tutor to show me the Louisiana form without calling it a Faute, so that I learn the local word without being punished for a correct one.
- As Logan, I want to dismiss a suggestion with `Compris` and have it stay dismissed after a reload, so that the review only shows what I haven't read yet.

## What to build

T21 already produces `standard` Corrections: at most 3 per text, `category = null`, `resourceIds = []`, dropped when the suggestion equals the quote, and never counted by `countsAsMistake`. T22 already counts them in the summary line and allows `standard: open → acknowledged` on `PATCH /api/corrections/:id`. Until now T22 renders them as plain list items. This ticket gives them their own look.

**MarkedText.** A `standard` mark has no fill, a 2 px dashed underline in `standard`, and an outlined round `<sup>` marker (white background, 1 px `standard` border). The marker links to `#correction-N` and is labelled `français standard N`, with visually hidden `(français standard N)` after the mark.

**CorrectionCard, `standard` variant.**

- Header: outlined marker pill and the `Français standard` label, uppercased by CSS.
- Quote line: the quote **not** struck (ink), `→` (muted), then `<strong>` with the Louisiana form in `standard` color.
- The French explanation as plain text.
- One secondary `Compris` button (`align-self: flex-start` on mobile).

`Compris` uses the existing endpoint. The card collapses to its header and a muted quote, the mark stays, focus moves to the next open card, and the state survives a reload. Kinds never rely on hue alone: the dashed underline and the outlined marker set `standard` apart from a Mistake.

This ticket does not show the `DLF` badge. `dlf` stays `null` until T24.

## Acceptance criteria

- [ ] `[unit]` MarkedText wraps each anchored `standard` span in a `<mark>` with the dashed style, an outlined marker linking to `#correction-N`, and hidden text `(français standard N)`. Unanchored `standard` Corrections produce no mark.
- [ ] `[unit]` The `standard` CorrectionCard renders the quote outside any `<s>`, the suggestion inside `<strong>`, the explanation, and exactly one button `Compris`. It has no pushback button and no Resource links.
- [ ] `[e2e]` With a fake evaluator fixture containing `ma voiture` → `mon char` as `standard`, the review shows a dashed mark with an outlined marker `1`. The card reads `FRANÇAIS STANDARD`, `ma voiture → mon char` and the explanation. Check at 1280 px and 390 px.
- [ ] `[e2e]` Clicking marker `1` moves focus to the `standard` card.
- [ ] `[e2e]` `Compris` collapses the card and moves focus to the next open card. After a reload the card is still collapsed and the mark is still present.
- [ ] `[e2e]` The summary line counts it as `1 en français standard`, not as a `faute`.
- [ ] `[e2e]` axe reports no violations on the review screen with the `standard` card open and collapsed.
- [ ] `[check]` `npm run check` passes. The production diff is under 500 lines.

## Tests to write first

- marked text: standard span gets a dashed mark and outlined marker
- correction card: standard variant shows unstruck quote and only Compris
- review e2e: standard mark and card at 1280 and 390 px
- review e2e: Compris on a standard card persists across a reload

## Out of scope

- `DLF` badge, DLF lookup, and pre-call hints: T24.
- Server changes to the `standard` kind (schema, prompt, invariants, transitions): already in T21/T22.
- Dialect check marks and pushback: T25.
- Weakness aggregation (where "never counted" shows in the Carnet): T28.
- Marks painting left to right: T35.

## References

- `HANDOFF.md`: Correction (three kinds table), Accessibility.
- `implementation-map.md`: §2.4 MarkedText, CorrectionCard (standard), §4.1 invariants, §5 CorrectionCard copy, §6 gap 20.
- `backend-requirements.md`: §1 `Correction`, `countsAsMistake`. §3 Corrections transitions.
- Tickets: T21 (kind invariants), T22 (`Compris` endpoint, summary).
- Screens: `Corrections.dc.html` (middle column), `HomeReview.dc.html`, `MobileReview.dc.html`.
