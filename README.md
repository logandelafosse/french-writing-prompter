# Consigne · Louisiana Languages

A Louisiana French writing tutor. Each day you get up to three consignes, write in French, and receive an Evaluation with Corrections in three kinds (Mistake, Standard→Louisiana, Dialect check). A Carnet holds Dialect Notes and Weaknesses. A Placement Test sets the starting CEFR Level.

## Prerequisites

- Node.js 20
- `OPENAI_API_KEY` (required unless you run the fake client)
- Optional: `APP_TIME_ZONE`, `DLF_LEXICON_PATH`

## Commands

```bash
npm run dev
npm run db:migrate
npm run check
npm run test:e2e
AI_CLIENT=fake npm run dev
npm run dialect:export
DLF_LEXICON_VERSION=x.y.z npm run dlf:fetch
```

`npm run dev` applies migrations then starts Next.js. `AI_CLIENT=fake` runs the UI offline against fixture-backed AI. `npm run test:e2e` is the Playwright suite. `npm run dlf:fetch` builds/updates the DLF lexicon pin.

## Docs

- Domain language: [`CONTEXT.md`](CONTEXT.md)
- Plan and tickets: [`docs/plan/`](docs/plan/)
- UI spec: [`docs/design/handoff/`](docs/design/handoff/)
- Deploy: [`docs/plan/vercel-deployment.md`](docs/plan/vercel-deployment.md)

## DLF lexicon

Louisiana French glosses come from a versioned lexicon artifact published by
`logandelafosse/DLF-extract`. Bump the pin with
`DLF_LEXICON_VERSION=x.y.z npm run dlf:fetch` and set `DLF_LEXICON_PATH`.
Tests use the committed fixture via `DLF_LEXICON_PATH`. See
`docs/plan/dlf-lexicon.md`.
