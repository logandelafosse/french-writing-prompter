# T06 — Single sources: dialect module, limits, local dates, knip, glossary

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 0 | HITL (Q2) | T04 | ~250 added (net negative after deletions) |

## User stories

- As Logan, I want the generator and the evaluator to apply the same Louisiana French rules, so that a prompt never asks for something the evaluator would mark down, like the subjunctive at B2.
- As Logan, I want "today" to mean my local calendar day, so that my 3 Writing Prompts don't reset at 18:00.
- As an agent implementing a ticket, I want each rule, limit and domain term defined once, so that I import it instead of copying it.

## What to build

**Owner question Q2:** approve the Louisiana base rule wording and the dialect-aware CEFR Level descriptions. **Default if accepted:** the wording in `backend-requirements.md` §4.4. B2 becomes "large éventail de temps; le subjonctif est rare en français louisianais et n'est jamais exigé". C1/C2 become "registres variés, structures complexes; pas de passé simple ni de subjonctif exigés". The PR body quotes the full rule list and all six descriptions for Logan to approve.

**Dialect module** (`src/modules/dialect/`):

- `louisiana-rules.ts`: base rules as data `{ id, rule_fr, rule_en, examples, neverFlag }`, plus `DEFAULT_DIALECT` and the `Dialect` schema.
- `level-descriptions.ts`: dialect-aware descriptions. None of them requires the subjunctive, passé simple or futur simple.
- `render.ts`: `renderForGenerator` and `renderForEvaluator`. Both render from the same rules.

The generator, the evaluator, the placement test and the History page use this module. The two copied rule strings and every `"louisiana"` literal outside the module are deleted.

**Config.** `src/config/limits.ts` holds `DAILY_PROMPT_QUOTA`, `WORD_TARGET` (250–300), `PLACEMENT_STEPS` and `ADVANCEMENT_STREAK`. `src/config/ai.ts` holds `AI_MODEL`. The literals `3`, `"gpt-4o"` and the copy "You've used your 3 prompts" read from these constants.

**Local dates.** `src/lib/dates.ts` provides `localDateKey(date, timeZone?)` and French formatters (e.g. `samedi 14 novembre`, `21 h 42`). The two `toISOString().split("T")[0]` calls in `quota-store.ts` switch to `localDateKey`. The `test` and `test:watch` scripts set `TZ=America/Chicago`.

**knip.** Add a `knip.json` (tooling review §6) and a `knip` script, and append `knip` to `check`. Delete everything it flags: `QuotaManager` and its test, `ui/button.tsx`, `initTracker`, and the unused dependencies (`@neondatabase/serverless`, `dotenv`, `lucide-react`, `class-variance-authority`, `@base-ui/react`).

**Glossary.** Update `CONTEXT.md`:

- Record the decision: **Standard French in Student Writing is never wrong**. It gets a Standard→Louisiana suggestion and never counts as a Mistake. Fix the French Dialect entry, which currently says Evaluations judge "not Standard French".
- Point the Louisiana French entry at `src/modules/dialect/louisiana-rules.ts` as the canonical rule list, in place of its inline feature list.
- Add these terms with `_Avoid_` lines:
  - **Correction**: one tutor note on a quote; kind is Mistake, Standard→Louisiana suggestion, or Dialect check.
  - **Mistake**: wrong in both Standard and Louisiana French; feeds Weakness memory.
  - **Standard→Louisiana suggestion**: never counted.
  - **Dialect check**: the tutor asks; Yes creates a Dialect Note, No makes it a Mistake.
  - **Dialect Note**: a learner-confirmed form the tutor never flags again.
  - **Weakness**: a Mistake category with a trend.
  - **Focus du jour**: up to 2 Weaknesses steering today's Writing Prompt.
  - **Resource**: a catalog link per Weakness category; never invented by the model.
  - **Carnet**: the page holding Weaknesses and Dialect Notes.
- Extend the Evaluation entry to include Corrections.

## Acceptance criteria

- [ ] `[check]` `rg -il 'eux-autre|vous-autre|nous-autre|être après|maringouin|chaoui' src` lists only files under `src/modules/dialect/`.
- [ ] `[check]` `rg -n "[\"']louisiana[\"']" src` and `rg -n '"gpt-' src` match only `src/modules/dialect/` and `src/config/` respectively.
- [ ] `[unit]` The generator's and the evaluator's system prompts each contain `renderForGenerator()` / `renderForEvaluator()` output for the default dialect.
- [ ] `[unit]` No level description contains `subjonctif`, `subjunctive`, `passé simple` or `futur simple` as a requirement. B2 states the subjunctive is never required.
- [ ] `[unit]` Under `TZ=America/Chicago`, with the system time `2026-11-14T21:30:00-06:00`, `localDateKey(now)` is `"2026-11-14"`. French formatters produce `21 h 42` and a lowercase weekday and month.
- [ ] `[unit]` Two quota increments at 21:30 Chicago time on 14 November count against the date key `2026-11-14`.
- [ ] `[check]` `npm run knip` exits 0 and runs inside `npm run check`; the listed dependencies are gone from `package.json`.
- [ ] `[check]` `CONTEXT.md` defines each term listed above and states that Standard French is never wrong; the "not Standard French" wording is gone.
- [ ] `[check]` Logan's Q2 approval is recorded on the PR before merge.

## Tests to write first

1. The generator and evaluator prompts both embed the shared rendered rules.
2. No level description requires the subjunctive, passé simple or futur simple.
3. `localDateKey` at 21:30 Chicago time returns the local date.
4. The quota key uses the local date in the evening.
5. French date and time formatting.

## Out of scope

- The quota derived from sessions, `resetsAt` and the header copy (T13).
- Injecting Dialect Notes and DLF hints into `renderForEvaluator` (T25, T24).
- The generated `docs/dialect/louisiana-french.md` export, and repointing `CONTEXT.md` to it (T27).
- The ast-grep rules that enforce these single sources (T07). The `no-magic-numbers` lint rule (T08).
- Generator v2 prompt content (T15) and Evaluator v2 (T21).

## References

- `docs/plan/backend-requirements.md` §0 D1, D2, D8; §1.1; §4.1 dialect layout; §4.4; §7 S3.
- `docs/agents/tooling-review.md` §1 "Problems found beyond the brief", §6 scripts and knip, §12 TOOL-6.
- `docs/design/implementation-map.md` intro vocabulary note and §6 gap 50.
- `docs/plan/plan.md` product decisions and owner question Q2.
