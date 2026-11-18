# T16 — Writing surface: ruled textarea, word meter, shortcuts, busy labels

GitHub issue: #18

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 1     | AFK  | T15        | ~330                    |

## User stories

- As Logan, I want to write on a ruled sheet that grows with my text, so that it feels like a notebook rather than a form.
- As Logan, I want to see how close I am to the word target without being blocked, so that I can send a short text when I'm tired.
- As Logan, I want ⌘/Ctrl+Enter to send my text and a distinct "reading your text" state, so that I know my writing is being evaluated, not a new prompt generated.

## What to build

Phase B gets the real writing surface under the PromptSheet, inside one Surface (desktop) or with the footer below the sheet (mobile, `MobileWriting.dc.html`). The rest of `PromptCard` is retired from `/`.

- **RuledTextarea** (implementation-map §2.3): visible `<label for>` `Ton texte` (uppercased by CSS), `<textarea lang="fr" spellcheck={false}>`, no border, ruled `repeating-linear-gradient` with period = line-height (18/32 desktop, 17/30 mobile), `background-attachment: local`. Auto-grows; height snaps to a multiple of the line height. Plain Enter inserts a newline; ⌘+Enter / Ctrl+Enter submits. Visible focus indicator on the sheet (`:focus-within`, §6.18). Read-only while evaluating.
- **WordMeter**: `aria-hidden` track (240 px desktop, full width mobile) with the target zone from `promptMeta.wordTarget` (`{ min, max }` from Q8 bands) and a fill capped at 100%; text `<strong>N</strong> / {min}–{max} mots`. Not a live region. When `promptMeta` is null, show `N mots` with no track. Nudge copy is only for mid/large targets (e.g. B1+ under target by 30–80 words): `Encore une cinquantaine de mots, si le cœur t'en dit. Tu peux envoyer n'importe quand.` Skip that nudge for A1's 10–20 band. The meter never disables submit.
- **WritingFooter**: meter left; `KbdHint` (`⌘ ↵` on Apple, `Ctrl ↵` elsewhere, `aria-hidden`, hidden on mobile) + **SubmitButton** `Corrige-moi` right. Submit has `aria-keyshortcuts="Meta+Enter Control+Enter"`.
- **SubmitButton** busy: `Je lis ton texte…`, `aria-busy`, disabled. It has its own flag; the generate label `Je cherche une consigne…` must never appear on submit.
- **Minimal Phase C placeholder**: after a successful submit, Home shows the prompt, the learner's text read-only, and the existing scores (reuse `EvaluationCard` content) plus `Une autre consigne · reste N`. Replaced by T22. Nothing that works today regresses.
- Submit with an empty or whitespace-only text is disabled (server already rejects it); any non-empty length is allowed.

## Acceptance criteria

- [ ] [unit] Word counter splits on whitespace only: `l'école` and `eux-autres` count as 1 word each; repeated spaces, tabs and newlines never add words; empty text is 0. One function, shared by client and server.
- [ ] [unit] WordMeter: fill width is `min(count/max,1)`; zone starts at `min/max`; null target renders `N mots` with no track; submit is never disabled by the meter at 0, 1, 299, 300 or 2000 words.
- [ ] [unit] RuledTextarea calls `onSubmitShortcut` on Meta+Enter and Ctrl+Enter, not on Enter or Shift+Enter.
- [ ] [unit] While evaluating only the submit busy label shows; while generating only the generate busy label shows.
- [ ] [e2e] 1280 px (B1 session): typing 12 words updates `12 / 250–300 mots`; the textarea grows past its initial height when 20 lines are pasted; `Corrige-moi` is enabled with 1 word.
- [ ] [e2e] A1 session: meter shows `N / 10–20 mots` and submit stays enabled below, inside, and above the band.
- [ ] [e2e] Ctrl+Enter submits; the button reads `Je lis ton texte…` and the text area is read-only until the placeholder Evaluation shows scores; `Je cherche une consigne…` is never visible during submit.
- [ ] [e2e] 390 px: meter full width, footer below the sheet, no KbdHint, no horizontal scroll.
- [ ] [e2e] The textarea is reachable by its label `Ton texte` (`getByLabel`) and has `lang="fr"`. axe clean.
- [ ] [check] `PromptCard` no longer imported by `/`; no shared `loading` boolean between generate and submit.

## Tests to write first

- `countWords handles elisions, hyphens and whitespace`
- `word meter never disables submit and caps the fill`
- `ruled textarea submits on Meta/Ctrl+Enter only`
- `submit and generate busy labels are independent`
- e2e `writing-surface.spec.ts` at 1280 and 390 px

## Out of scope

- Draft autosave and DraftStatus (T17).
- Quota-exhausted notice and swap confirm (T18).
- Evaluation failure alert (T19).
- Corrections, marked text and the real review screen (T21, T22).

## References

- `HANDOFF.md` → Home / Phase B (textarea, word meter, loading labels), Accessibility.
- `screens/Main.dc.html`, `screens/MobileWriting.dc.html`.
- `implementation-map.md` §2.1 KbdHint, §2.3 RuledTextarea, WordMeter, WritingFooter, SubmitButton, §5 PromptSheet / writing, §6 items 18, 33, 35, 36, §7 slice 4.
