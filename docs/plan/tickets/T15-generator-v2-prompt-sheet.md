# T15 — Generator v2 with structured prompt meta; prompt sheet

GitHub issue: #17

| Phase | Type              | Blocked by | Production lines (est.) |
| ----- | ----------------- | ---------- | ----------------------- |
| 1     | AFK (Q8 answered) | T14        | ~320                    |

**Word targets (Q8, answered 2026-11-15):** soft nudge only, never blocks. Server-owned by CEFR Level (model never chooses):

| Level | Target  |
| ----- | ------- |
| A1    | 10–20   |
| A2    | 80–120  |
| B1–C2 | 250–300 |

Lives in `src/config/limits.ts` (or equivalent) as `WORD_TARGET_BY_LEVEL`.

## User stories

- As Logan, I want each Writing Prompt to tell me its genre, tenses, length, tone and registre (formel / familier / mixt), so that I know what I'm aiming for before I write — including when to practise formal vs informal style.
- As Logan, I want a clear "looking for a prompt" state while it generates, so that I don't click twice.

## What to build

- **Generator v2 (backend §4.3, slice S11 minus Focus/topics/pin)**: the prompt generator calls the AI client through T04's validated `chatCompletionJSON(Schema, params)` with a zod output schema `{ text, genre, tense, tone, registre, topic, topic_tags }`, all in French. `registre` is a required enum: `formel` | `familier` | `mixt`. The Writing Prompt text must state the registre explicitly (e.g. lettre formelle au maire vs billet à un cousin). The server attaches `wordTarget: { min, max }` from `WORD_TARGET_BY_LEVEL[currentLevel]` and stores the result as `PromptMeta` in `sessions.prompt_meta_json` (generated migration). Validation: `text` 150–1500 characters (prompt text length, not the learner word target). Instructions keep the dialect rules from the T06 module and never require the subjonctif, passé simple or futur simple; futur proche is fine. Across prompts, vary `registre` so Logan practises both formel and familier (and mixt when useful); do not lock to familier only because Louisiana French is the dialect.
- `POST /api/prompt` returns `{ session: { id, promptText, promptMeta }, quota }`; `GET /api/today` returns `promptMeta` on `activeSession`. Legacy rows with no meta return `promptMeta: null`.
- **PromptSheet** (implementation-map §2.3), `writing` mode: label `Consigne d'écriture` (uppercased by CSS), serif 22 px prompt (19 px mobile), then the meta row `récit · passé composé et imparfait · 250–300 mots · familier` (`{genre} · {tense} · {min}–{max} mots · {registre}`, with optional short `tone` if it adds colour beyond registre). Mobile stacks meta and swap. `meta: null` hides the meta line. The swap button generates a new prompt (confirm and quota rules arrive in T18).
- **GenerateButton**: its own busy flag. While generating, label `Je cherche une consigne…` (ellipsis character), `aria-busy="true"`, disabled, busy colour. Never shares a flag with submit.
- **Motion 1**: the prompt fades up when it arrives (opacity 0→1, ~6 px rise, ~200 ms). No animation under `prefers-reduced-motion: reduce`.
- Update `CONTEXT.md` **Writing Prompt** to mention structured meta including **Registre** (`formel` / `familier` / `mixt`): the style the Student Writing must match; Evaluations judge Register & Style against it.

## Acceptance criteria

- [ ] [unit] Generator output schema rejects missing fields and `text` outside 150–1500 chars; the fake client's malformed output raises `AiOutputError`, not a raw `SyntaxError`.
- [ ] [unit] Stored `wordTarget` is `{ min, max }` from `WORD_TARGET_BY_LEVEL` for the session's CEFR Level (A1 → 10–20, A2 → 80–120, B1+ → 250–300) even if the model output contains a word count.
- [ ] [unit] Generator system prompt contains the dialect module rules and does not require `subjonctif`, `passé simple` or `futur simple` (prompt-builder test).
- [ ] [unit] Meta formatter produces `récit · passé composé et imparfait · 250–300 mots · familier` from a B1 fixture with `registre: "familier"`, and `10–20 mots` for an A1 fixture.
- [ ] [unit] Generator schema rejects a missing or unknown `registre`; fixtures cover `formel`, `familier` and `mixt`.
- [ ] [unit] Generator instructions tell the model to vary registre across prompts and to state the registre in the prompt text.
- [ ] [integration] `POST /api/prompt` with `FakeAiClient` persists `prompt_meta_json` and returns it; a legacy row yields `promptMeta: null` without throwing.
- [ ] [e2e] 1280 px: clicking `Donne-moi une consigne` shows `Je cherche une consigne…` on a disabled button, then the prompt sheet with label, prompt and meta line.
- [ ] [e2e] 390 px: meta line and `↻ Une autre consigne` stack; prompt is readable without horizontal scroll.
- [ ] [e2e] With `reducedMotion: 'reduce'`, the prompt is fully opaque immediately after it appears.
- [ ] [e2e] Pressing `↻ Une autre consigne` (no draft) shows a different prompt and the busy label while loading.

## Tests to write first

- `generator output schema enforces required French fields and text length`
- `generator attaches the server word target`
- `generator prompt never requires subjunctive, passé simple or futur simple`
- `formatPromptMeta joins genre, tense, range and registre with middots and an en dash`
- `generator schema requires registre formel|familier|mixt`
- `prompt route stores and returns prompt meta`
- `generate button shows the generate busy label only while generating`
- e2e `prompt-sheet.spec.ts` at 1280 and 390 px, with a reduced-motion case

## Out of scope

- Focus, recent-topics avoidance and the "Pratiquer ça" pin as generator inputs (T29).
- Ruled textarea, word meter and submit busy label (T16).
- Swap confirmation, `· à minuit` disabled swap, and swap quota rules (T18).
- Generation failure alert (T19).

## References

- `HANDOFF.md` → Home / Phase B (meta line, loading labels), Motion 1.
- `implementation-map.md` §2.3 PromptSheet and GenerateButton, §4.6, §5 PromptSheet / writing, §6 item 11, §7 slice 3.
- `backend-requirements.md` §1 `PromptMeta`, §2.2 `promptMetaJson`, §4.1, §4.3, §4.4 (level descriptions), §7 S11.
- `plan.md` Q8.
