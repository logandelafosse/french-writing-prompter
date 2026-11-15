# T18 — Quota exhausted, swap confirm, session statuses

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 1 | HITL (Q8) | T17 | ~330 |

**Owner question Q8 (swap cost).** Default if accepted: `↻ Une autre consigne` uses one of the three daily slots, exactly like a fresh generate, whether or not the old prompt had a Draft.

## User stories

- As Logan, when I've used my three Writing Prompts, I want to know when the next one arrives, and still be able to send the Draft I'm working on.
- As Logan, I want to be asked before swapping away from a prompt I've started writing, and to know the Draft isn't thrown away.

## What to build

**Swap and statuses (server).**

- `POST /api/prompt` accepts `{ replaceSessionId?, confirmAbandon? }`. If today's active session has non-empty text and `confirmAbandon` is not true → `409 DRAFT_WOULD_BE_ABANDONED { wordCount }`. Otherwise the previous active session becomes `abandoned` (`abandoned_at` set) in the same transaction that creates the new one and counts quota.
- Pure `deriveDisplayStatus(row, today)` (backend §3 table): `evaluated`; `in_progress` (active today); `draft_abandoned` (abandoned, or active from an earlier day, with text); `prompt_unused` (same, with empty text). Implementation-map §4.8 names these `abandoned_draft` / `unused_prompt`; use the backend names. History rendering is T31.

**Quota-exhausted Phase B (`HomeQuota.dc.html`).**

- Calm `Notice` (`role="status"`) above the sheet: title `T'as pris tes trois consignes pour aujourd'hui.`, body `La prochaine arrive à minuit, dans {h} h {mm}. Ton brouillon reste icitte : tu peux le finir et l'envoyer quand tu veux.` The countdown is computed client-side from `resetsAt` and refreshes each minute. Without an active session, the second sentence is omitted.
- Prompt label `Consigne d'écriture · 3 sur 3`, shown only when exhausted (§6.26).
- Swap shows `↻ Une autre consigne · à minuit` and is disabled; generate is disabled in A-ready.
- `Corrige-moi` stays enabled: Evaluation never consumes quota.

**ConfirmSwapDialog (`States.dc.html`).**

- Shown only when the Draft has ≥ 1 word; with 0 words the swap goes straight through (old session ends `prompt_unused`).
- Inline `role="alertdialog" aria-label="Changer de consigne"` under the meta row: `Changer de consigne ?`, `Ton brouillon de {n} mots va rester dans l'Historique.`, buttons `Garder celle-là` (focused on open) and `Changer`. Escape = keep; focus returns to the swap button. `Changer` retries with `confirmAbandon: true`.

## Acceptance criteria

- [ ] [unit] `deriveDisplayStatus` table test covers all four outputs, including an `active` row from yesterday.
- [ ] [unit] Countdown formatter: `resetsAt` 1 h 46 min away → `1 h 46`; 5 min → `0 h 05`.
- [ ] [integration] Swap with text and no confirm → 409 with `wordCount`, nothing changed; with `confirmAbandon` → old session `abandoned`, new session `active`, quota used +1.
- [ ] [integration] Swap with empty text needs no confirm and the old row derives `prompt_unused`.
- [ ] [integration] Evaluate succeeds at `remaining: 0`.
- [ ] [e2e] 1280 px, third prompt in progress with a Draft: notice title and countdown visible, label `Consigne d'écriture · 3 sur 3`, swap disabled with `· à minuit`, `Corrige-moi` enabled and submitting works.
- [ ] [e2e] Swap with a 40-word Draft: dialog shows `Ton brouillon de 40 mots va rester dans l'Historique.`, focus on `Garder celle-là`; Escape keeps the prompt and text; `Changer` loads a new prompt with an empty textarea and quota decremented.
- [ ] [e2e] Swap with an empty textarea: no dialog, new prompt loads.
- [ ] [e2e] 390 px: notice, dialog and disabled swap fit without horizontal scroll. axe clean with the dialog open.

## Tests to write first

- `deriveDisplayStatus maps stored state and day to display status`
- `formatCountdown renders hours and zero-padded minutes`
- `prompt route requires confirmation before abandoning a draft`
- `swap abandons the old session and counts against quota`
- `evaluate is allowed when quota is exhausted`
- `confirm swap dialog focuses the safe action and closes on Escape`
- e2e `quota-exhausted.spec.ts`, `swap-confirm.spec.ts` at 1280 and 390 px

## Out of scope

- History rows for the three statuses (T31).
- Review CTA disabled state `Une autre consigne · à minuit` (T22).
- Offline and AI-failure handling of the swap request (T19).

## References

- `HANDOFF.md` → Home / Phase B (swap), States (quota exhausted, swap confirm).
- `screens/HomeQuota.dc.html`, `screens/States.dc.html`.
- `implementation-map.md` §2.5 Notice, ConfirmSwapDialog; §3.3 swap transition; §4.8; §4.10; §5 Quota notice, States (swap.*), PromptSheet (`swap.disabled`, `prompt.label.withIndex`); §6 items 24, 26; §7 slice 6.
- `backend-requirements.md` §3 conventions (`DRAFT_WOULD_BE_ABANDONED`), Prompts and sessions, `displayStatus` table; §7 S6.
- `plan.md` Q8.
