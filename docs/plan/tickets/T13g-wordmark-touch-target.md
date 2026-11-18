# T13g — Wordmark 44px touch target (PR #57 regression)

GitHub issue: #59

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 1     | AFK  | T13e       | ~10                     |

Post-merge **blocking** adversarial review on [PR #57](https://github.com/logandelafosse/french-writing-prompter/pull/57): `min-h-touch` moved from the wordmark `Link` to a row wrapper that uses `sm:contents`, so the anchor is not a 44px hit target (HANDOFF + mobile comp).

## What to build

- Restore `min-h-touch` (and `inline-flex` + `items-center` as needed) on the wordmark `Link` in `header-shell.tsx` for full and placement variants.
- Row wrapper may keep layout classes; the **link** owns minimum height at all breakpoints.
- [e2e] Optional: assert wordmark link box ≥ 44px on 390 viewport (only if stable without geometry slop).

## Acceptance criteria

- [ ] [check] Wordmark link has `min-h-touch` on the `<Link>`, not only on a `sm:contents` parent.
- [ ] [e2e] Mobile header quota spec still passes; no three-row regression.

## Out of scope

- Stale level GET (T13f).

## References

- `docs/design/handoff/HANDOFF.md`; adversarial review PR #57 blocking #1.
