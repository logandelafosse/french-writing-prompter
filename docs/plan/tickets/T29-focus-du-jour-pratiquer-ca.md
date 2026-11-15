# T29 — Focus du jour driving prompts; "Pratiquer ça"

| Phase | Type | Blocked by | Production lines (est.)       |
| ----- | ---- | ---------- | ----------------------------- |
| 3     | AFK  | T15, T28   | ~420 (close to the 500 limit) |

## User stories

- As Logan, I want Home to show `FOCUS DU JOUR` with my one or two most active Weaknesses, and today's Writing Prompt to make me practise them, so that each day targets what I get wrong.
- As Logan, I want to press `Pratiquer ça` on any Weakness in the Carnet so that my next prompt works on it.
- As Logan, I want Fautes in today's Focus tagged `focus du jour` in the review, and a link to that Weakness in the Carnet.

## What to build

**Computing Focus.** `computeFocus(weaknesses, pin)` follows backend-requirements §1.3:

1. A pending pin comes first.
2. The rest is filled up to 2 with `actif` Weaknesses (never `autre`), ranked by `s`, then window count, then `lastSeenAt`.
3. If nothing qualifies, Focus is empty.

**Prompt generation.** Generating a prompt snapshots Focus onto the session (`focus_json`) and consumes the pin. The generator receives the Focus categories with an `elicitHint` each, plus the topics of the last 10 sessions. The prompt asks for a scenario that needs those structures without naming grammar terms, and avoids the recent topics. The evaluator receives the session's Focus labels, and the post-processor sets `isFocus` on Mistakes whose category is in the snapshot. The taxonomy gains `inlineName`, `shortName` and `elicitHint` for each category.

**FocusLine on Home.** The line shows `FOCUS DU JOUR` and the names joined with `·`.

- Before a prompt exists it shows the computed Focus. After a prompt exists it shows the session snapshot.
- Layout by screen:
  - **desktop A-ready and writing:** `inline`
  - **mobile writing:** `stacked`
  - **mobile A-ready:** `hero` — capitalized names one per line, the reason line, the full-width generate button, and the link `Changer de focus dans le Carnet`
  - **desktop review:** on the title row
- Mobile review omits it. An empty Focus renders nothing.
- Reason copy:
  - auto Focus: `C'est ce qui est revenu le plus dans tes dernières évaluations. La consigne va t'y faire travailler.`
  - pinned Focus (inferred): `Tu l'as choisi dans le Carnet. La consigne va t'y faire travailler.`

**Pratiquer ça.** `POST` and `DELETE /api/weaknesses/:category/practice` use the `practice_requests` migration and keep at most one pending pin. The Carnet `Pratiquer ça` button:

- is outline-primary, or plain secondary on `tranquille` rows
- toggles `aria-pressed`, and the row meta gains ` · prochaine consigne` (inferred) while pinned
- after the pin is consumed, the pinned category's row shows ` · focus du jour` in primary

**Review.** Mistake cards with `isFocus` show the `focus du jour` tag. The review CTAs gain `« {shortName} » dans le Carnet →` linking to `/carnet#weakness-<category>` for the first Focus Weakness. It is hidden when the session has no Focus.

## Acceptance criteria

- [ ] `[unit]` `computeFocus`: pin first, fills to 2 from `actif`, excludes `autre` and non-actif, returns `[]` for a new learner.
- [ ] `[unit]` The generator prompt builder includes Focus labels with elicit hints and recent topics, and never names `subjonctif` as a requirement.
- [ ] `[unit]` The post-processor sets `isFocus` only for Mistakes whose category is in the session snapshot.
- [ ] `[integration]` `POST /api/prompt` stores `focus_json` and marks the pending pin consumed with the new session id. A second `POST …/practice` cancels the earlier pin. An unknown category returns 422.
- [ ] `[integration]` `GET /api/weaknesses` returns `focus`, and the Home bootstrap returns the computed Focus before a prompt and the snapshot after.
- [ ] `[e2e]` With seeded Weaknesses, Home shows `FOCUS DU JOUR` and two names before generating. After generating, the same names appear above the prompt. Check at 1280 px (inline) and 390 px (hero before the prompt, stacked after).
- [ ] `[e2e]` A new learner sees no FocusLine.
- [ ] `[e2e]` Pressing `Pratiquer ça` on `Accents (é / è / ê)` sets `aria-pressed="true"`. On Home that category is first in Focus with the pinned reason line. The fake generator request contains it.
- [ ] `[e2e]` In the review, a Mistake in a Focus category shows `focus du jour`. The CTA `« ‑er / ‑é » dans le Carnet →` navigates to `/carnet#weakness-infinitif_participe`.
- [ ] `[e2e]` axe reports no violations on Home (both phases) and on `/carnet`.
- [ ] `[check]` `npm run check` passes. The production diff is under 500 lines.

## Tests to write first

- computeFocus: pin, fill, exclusions, empty
- generator prompt: includes Focus hints and avoids recent topics
- post-processor: isFocus from snapshot only
- prompt route: snapshots Focus and consumes the pin
- home e2e: Focus line before and after a prompt, per viewport
- carnet e2e: Pratiquer ça pins and biases the next prompt
- review e2e: focus du jour tag and Carnet CTA

## Out of scope

- History rows titled by Focus: T31.
- Resource links: T30.
- Choosing Focus by hand beyond the single pin: not designed.

## References

- `HANDOFF.md`: Home (Focus line), Carnet, Correction (focus tag), Phase C CTAs.
- `implementation-map.md`: §2.3 FocusLine, §2.4 CorrectionsRegion CTAs, §2.7 CarnetWeaknessRow, §4.3, §4.5, §5 FocusLine/Review/Carnet copy, §6 gaps 6, 15, 19, 30, 31.
- `backend-requirements.md`: §1.3, §2.2 (`focus_json`, `practice_requests`), §3 Weaknesses, §4.2 prompt item 6 and post-processing item 6, §4.3.
- Screens: `Main.dc.html`, `MobileEmpty.dc.html`, `MobileWriting.dc.html`, `HomeReview.dc.html`, `Carnet.dc.html`.
