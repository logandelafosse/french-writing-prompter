# T03 — Prettier format-only pass

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 0 | AFK | T02 | ~20 config (the format commit is exempt via the `size-exempt` label) |

## User stories

- As an adversarial reviewer, I want agent PRs free of whitespace and quote churn, so that every diff line I read is a real change.
- As Logan as maintainer, I want `git blame` to skip the one mass-format commit, so that blame still points at the change that mattered.

## What to build

Add Prettier with `prettier-plugin-tailwindcss` so class order is deterministic. Add `format` (`prettier --write .`) and `format:check` (`prettier --check .`), and append `format:check` to `check`.

`.prettierignore` covers:

- generated or vendored files: `drizzle/`, `.next/`, `next-env.d.ts`, `package-lock.json`
- the design handoff under `docs/design/handoff/`, which is reference material and is not reformatted

The PR has exactly three commits:

1. **Config:** dependencies, `.prettierrc`, `.prettierignore`, scripts.
2. **Format-only:** the output of `npm run format`, with no other edit.
3. **Blame:** `.git-blame-ignore-revs` containing the format-only commit's SHA.

The coordinator applies the `size-exempt` label (T02) and merges with a merge commit, not squash or rebase, so the recorded SHA survives.

## Acceptance criteria

- [ ] `[check]` `npm run format:check` exits 0, and `npm run check` includes it and exits 0.
- [ ] `[check]` Reproducibility: check out the config commit, run `npm run format`, and diff against the format-only commit. The diff is empty.
- [ ] `[check]` The format-only commit touches no `package.json` script, dependency, or config file.
- [ ] `[check]` `npm test` reports the same number of passing tests before and after the format commit.
- [ ] `[check]` `.git-blame-ignore-revs` contains the format-only commit SHA, and `git blame --ignore-revs-file .git-blame-ignore-revs src/app/layout.tsx` attributes no line to it.
- [ ] `[check]` A scratch file with `className="p-4 flex"` fails `format:check` until it is reformatted to Tailwind's class order.
- [ ] `[check]` `git diff --stat` on the format commit lists no file under `docs/design/handoff/` or `drizzle/`.

## Tests to write first

None. The behaviour is the formatter's, and the criteria above are reproducible shell checks.

## Out of scope

- Any semantic code change, including lint fixes that Prettier surfaces (file them for T08).
- Pre-commit formatting through Lefthook (T12).
- ESLint stylistic rules. Prettier owns formatting alone.

## References

- `docs/agents/tooling-review.md` §6 "Prettier" and §12 TOOL-3.
- `docs/plan/tickets/T02-baseline-green-ts-flags-check-pr-size-ci.md` (`size-exempt` label).
