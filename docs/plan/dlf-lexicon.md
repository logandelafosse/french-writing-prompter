# DLF lexicon artifact

Consigne inherits Louisiana French glosses and examples from
[`logandelafosse/DLF-extract`](https://github.com/logandelafosse/DLF-extract)
as a **versioned JSON lexicon**, not a git submodule and not a spellings-only
index (plan Q6).

## Contract

Trimmed JSON (no raw OCR articles):

```json
{
  "version": "x.y.z",
  "entries": [
    {
      "id": "asteur-0a4c0152c15a",
      "headword": "asteur",
      "forms": ["asteur", "asteure"],
      "senses": [
        {
          "pos": "adv.",
          "glosses": ["now, right now"],
          "examples": [
            {
              "louisiana_french_text": "Asteure, lâche!",
              "translation": "Now, let go!"
            }
          ]
        }
      ]
    }
  ]
}
```

Built in DLF-extract from `out/canonical.jsonl` (planned `npm run export:lexicon`)
and published as a GitHub Release asset
`dlf-lexicon.json` on tag `dlf-lexicon-vX.Y.Z`, and/or as
`@logandelafosse/dlf-lexicon@X.Y.Z`. Publisher follow-up:
[DLF-extract#41](https://github.com/logandelafosse/DLF-extract/issues/41).

## Pin and bump (Consigne)

1. Cut the Release in DLF-extract (follow-up until the publisher exists).
2. Set `DLF_LEXICON_VERSION=X.Y.Z` and run `npm run dlf:fetch`.
3. That writes `src/data/dlf/lexicon.json` and `src/data/dlf/version`.
4. Point production at it with `DLF_LEXICON_PATH=src/data/dlf/lexicon.json`.
5. Commit the pin file (and the artifact if the repo keeps a copy). Bumping
   the version string is how DLF changes inherit.

Until that Release exists, Consigne ships a **committed fixture** of 27
real DLF entries at `src/test/fixtures/dlf/lexicon.json`. Tests and Playwright
set `DLF_LEXICON_PATH` to that fixture. They never read `../DLF-extract` or
call OpenAI/DLF.

If the file is missing, lookups are empty, Evaluation still completes, and
`standard` Corrections stay with `dlf = null` (no badge). DLF is positive
evidence only.

## Runtime

- `src/modules/dlf` loads the lexicon once per process (`import "server-only"`).
- Before the model call, content words (4+ letters, cap `DLF_HINT_MAX_HITS`)
  that hit the lexicon are injected as short cards, truncated to
  `DLF_HINT_MAX_TOKENS` (estimated as `ceil(chars / 4)`).
- After the model call, attested `standard` suggestions get
  `dlf = { entryId, headword }`; a miss keeps the Correction and hides the
  badge.
