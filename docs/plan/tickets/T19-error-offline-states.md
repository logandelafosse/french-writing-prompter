# T19 — Error and offline states

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 1     | AFK  | T17        | ~340                    |

## User stories

- As Logan, when the tutor fails to read my text, I want to retry without losing a word.
- As Logan, when my connection drops, I want to keep writing and know my Draft is safe on this device.
- As Logan, I never want a page stuck on a loading skeleton.

## What to build

**ErrorAlert** (`States.dc.html`): `role="alert"`, 1 px mistake border, banner layout, primary `Essayer encore`. Two contexts:

- Evaluation failure (`502 AI_*`, `504 AI_TIMEOUT`, or `500`): `**J'ai pas pu lire ton texte ce coup-ci.** Il est toujours là, y a rien de perdu.` Stays in Phase B; textarea text and Draft untouched; retry re-submits the same text.
- Generation failure: `**J'ai pas pu trouver de consigne ce coup-ci.**` (inferred copy, implementation-map §5 `error.generate`) + `Essayer encore`. Quota is not consumed by a failed generation (server rolls back the session insert).

**Server error envelope.** Add the shared `withErrors(handler)` wrapper (backend §3 conventions) and apply it to the prompt, evaluate, draft, level, quota, today and sessions routes: `AiOutputError` (T04) → `502 AI_INVALID_OUTPUT`, AI connection/5xx/429 → `502 AI_UNAVAILABLE`, timeout → `504 AI_TIMEOUT`, anything else → `500 INTERNAL`; the cause is logged. The client reads `{ error: { code, message } }` only; it never parses HTML or shows a raw message.

**OfflineNotice**: calm Notice `role="status"`: `**Pas de connexion.** Ton brouillon est gardé sur cet appareil. Tu peux continuer à écrire.` + secondary-strong `Réessayer`. Trigger: `navigator.onLine === false`, the `offline` event, or a fetch `TypeError`. While offline, DraftStatus reads `Brouillon gardé sur cet appareil` (localStorage copy from T17 keeps updating). On `online` or `Réessayer`, the pending draft is pushed and the notice clears.

**No indefinite skeletons**: every client fetch that drives a loading state (`/api/today`, `/api/level`, `/api/sessions` in the current `history-page.tsx`) resolves to content, the OfflineNotice, or an ErrorAlert with retry within the fetch timeout (~10 s). Remove the open-ended `animate-pulse` skeleton.

## Acceptance criteria

- [ ] [unit] `classifyFetchFailure` maps `TypeError` → offline, envelope with `AI_*` → AI failure, other envelopes → generic error, non-JSON body → generic error.
- [ ] [integration] Generation with a failing `FakeAiClient` returns `502 AI_UNAVAILABLE` and leaves quota `used` unchanged.
- [ ] [integration] Each wrapped route answers a thrown unknown error with `500` and a JSON envelope (`code: "INTERNAL"`), never HTML; an `AiOutputError` maps to `502 AI_INVALID_OUTPUT`.
- [ ] [e2e] 1280 px: evaluation route mocked to 502 → `role="alert"` with `J'ai pas pu lire ton texte ce coup-ci.`; the textarea still holds the exact text; `Essayer encore` with the route now succeeding shows the Evaluation.
- [ ] [e2e] Generation route mocked to 502 → alert with `J'ai pas pu trouver de consigne ce coup-ci.`; header quota unchanged; retry succeeds.
- [ ] [e2e] `context.setOffline(true)` while writing → `Pas de connexion.` notice, DraftStatus `Brouillon gardé sur cet appareil`, typing still works; back online + `Réessayer` → notice gone, `Brouillon sauvé à` returns and the server holds the text.
- [ ] [e2e] `/api/today` and `/api/sessions` never respond (route held) → a notice with `Réessayer` appears within the timeout; no skeleton remains.
- [ ] [e2e] 390 px: alert and notice wrap without horizontal scroll; `Essayer encore` and `Réessayer` are ≥ 44 px tall. axe clean.
- [ ] [check] No `animate-pulse` without a bounded timeout in `src/components`.

## Tests to write first

- `withErrors maps AI and unknown errors to JSON envelopes`
- `classifyFetchFailure distinguishes offline, AI failure and generic errors`
- `failed generation does not consume quota`
- `error alert keeps the text and retries the same submission` (component test)
- `offline notice appears on the offline event and clears on retry`
- e2e `errors.spec.ts`, `offline.spec.ts` at 1280 and 390 px

## Out of scope

- History redesign and per-row malformed notices (T31).
- Placement error states (T34).
- Request body schemas and `parseBody` (T05); `AiOutputError` itself (T04).

## References

- `HANDOFF.md` → States (AI failure, Offline / fetch failure).
- `screens/States.dc.html`.
- `implementation-map.md` §2.5 ErrorAlert, OfflineNotice; §3.1 HomeOverlay; §5 States, `draft.local`; §6 item 23; §7 slice 7.
- `backend-requirements.md` §3 conventions (error envelope, `withErrors`, codes), §4.1 step 4 (error mapping).
