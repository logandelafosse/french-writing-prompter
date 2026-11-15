# French Writing Prompter — design handoff

Audience: the agent implementing this redesign in the existing Next.js app.
Source canvas: https://claude.ai/artifact/1VE6idN86HvvCpyYbgdkuw

## How to read this bundle

- `screens/*.dc.html` — one file per screen or component sheet. Each is plain HTML with inline styles inside an `<x-dc>` wrapper. Read the markup between `<x-dc>` and `</x-dc>`; ignore `support.js`, `<helmet>`, and the trailing `<script type="text/x-dc">` block (canvas runtime only). `<sc-if>` is a conditional wrapper; `{{name}}` is a template value.
- `canvas.json` — artboard sizes and the designer's annotation notes (`notes`).
- Inline styles hold the exact values. Treat them as the spec; lift them into your own tokens/components rather than copying inline styles.
- All sample content (learner text, corrections, dates, counts, scores) is illustrative data, not fixtures to ship.
- The mockups were not rendered and checked. Frame heights in `canvas.json` are estimates. Trust the markup and this spec over any frame size.

## Screen map

| File | Screen | Brief section |
|---|---|---|
| `HomeEmpty.dc.html` | Home A, first visit: pick CEFR level or go to Placement Test | Home / A |
| `Main.dc.html` | Home B, prompt ready + writing, Focus line, word meter | Home / B |
| `HomeReview.dc.html` | Home C, Evaluation: marked text left, Corrections right, Scores collapsed | Home / C |
| `HomeQuota.dc.html` | Home, quota exhausted, draft preserved, submit still enabled | Quota state |
| `MobileEmpty.dc.html` | Mobile (390 px), returning user, Focus shown before generate | Home / A |
| `MobileWriting.dc.html` | Mobile writing | Home / B |
| `MobileReview.dc.html` | Mobile review, Corrections stacked under marked text | Home / C |
| `Corrections.dc.html` | Correction component, three kinds side by side with their in-text marks | Correction |
| `DialectNote.dc.html` | Add Dialect Note sheet (right-side panel on desktop) | Add Dialect Note |
| `States.dc.html` | AI failure, offline, swap-prompt confirm, level advancement, two loading labels | States |
| `Carnet.dc.html` | Carnet: Weaknesses list + Dialect Notes list | Carnet |
| `History.dc.html` | History list, one expanded row, one incomplete-data row | History |
| `PlacementStart.dc.html` / `PlacementStep.dc.html` / `PlacementDone.dc.html` | Placement Test start, step 2 of 3, result | Placement Test |

## Design tokens

Colors

| Token | Hex | Use |
|---|---|---|
| desk | `#E6EBE6` | page background (plus a 5 px dot grain and a soft top-left highlight `#F3F6F1`; see root `background-image` in any Home file) |
| sheet | `#FCFDFA` | writing sheet, cards, sheet panel |
| ink | `#17211D` | primary text |
| ink-2 | `#3A4640` | secondary text on sheet |
| muted | `#55625C` | labels, meta, captions |
| disabled-text | `#6B7770` | disabled controls |
| line | `#D0D8D1` | sheet borders, dividers |
| line-strong | `#B9C4BC` | control borders |
| input-border | `#8D9A92` | text inputs |
| rule | `#DCE3DD` | ruled lines in textarea, meter track |
| primary | `#1F5A4A` | primary buttons, links, Focus label; hover `#123C31` |
| primary-tint | `#E3EEE8` | selected level, advancement banner |
| meter-target | `#BCD3C8` | 250–300 zone on the word meter |
| busy | `#2F4A40` | loading-state buttons |
| notice | `#EEF2ED` | calm banners (quota, offline, incomplete data) |
| mistake | `#A8321A` | Mistake label, marker, underline; tint `#F7E1DA` |
| standard | `#1F4E8C` | Standard→Louisiana label, marker, underline; no fill |
| dialect | `#7A5A00` | Dialect check label, marker, underline, buttons; tint `#F6ECC8` |

Type (Google Fonts)

- UI and headings: Bricolage Grotesque (400/500/600/700), fallback `'Trebuchet MS', sans-serif`.
- French prose (prompt, learner text, quotes, rules): Newsreader (400/500, italic 400), fallback `Georgia, serif`.
- Page title 46 px / 600 / -0.03em. Section title 24 px / 600. Wordmark 32 px / 700 (26 px mobile).
- Prompt 22 px / 1.45 (19 px mobile). Learner text 18 px on a 32 px line (17/30 mobile); 34 px line when marked up.
- Section labels: 12 px / 700 / 0.12em tracking, uppercase, muted.
- Body UI 15–16 px; meta 13–14 px.

Shape and spacing

- Radius 6 px everywhere; level chip 22 px (pill); marker pills 9–10 px; Dialect marker 3 px (squared).
- Sheet: 1 px `line` border, shadow `0 18px 40px -28px rgba(23,33,29,0.45)`, padding 36–44 px desktop, 18–22 px mobile.
- Single column `max-width: 760px` (Home, Placement), 860 px (Carnet, History), 1200 px (review split).
- Minimum touch target 44 px; primary buttons 48 px (54 px full-width on mobile).

## Components and behavior

Header
- Wordmark (working name "Lâche pas." with a rust full stop; the name is a placeholder pending the owner's decision), nav links Carnet · Historique, quota text, CEFR chip (`B1 ▾`) that opens level change.
- Quota copy: `Reste N consignes sur 3`; exhausted: `3 consignes sur 3 prises`. Max 3 Writing Prompts per day, reset at local midnight.
- Mobile: wordmark + chip on row one, nav + quota on row two.
- First run (no CEFR): no chip. Placement Test screens use a reduced header.

Home, one surface with three phases (not stacked cards)
- Title is today's date. Focus line (`FOCUS DU JOUR` + 1–2 Weakness names) sits directly above the sheet, both before a prompt exists and after.
- Phase A, first run: level picker (six buttons, `aria-pressed`), primary `Donne-moi une consigne`, secondary link to Placement Test.
- Phase B: prompt, meta line (`genre · temps · 250–300 mots · ton`), `↻ Une autre consigne`, textarea, footer.
  - Textarea: auto-grow, `lang="fr"`, ruled-line background (`repeating-linear-gradient`, period = line-height, `background-attachment: local`), no visible border, associated `<label>`.
  - Draft autosave with timestamp (`Brouillon sauvé à 21 h 42`). Keyboard submit ⌘/Ctrl + Enter.
  - Word meter: soft nudge only. Track with a marked 250–300 zone; never blocks submit, at any length.
  - Swapping the prompt with a draft present asks for confirmation; the draft is kept in History (see `States.dc.html`).
  - Loading labels are separate: `Je cherche une consigne…` (generating) and `Je lis ton texte…` (evaluating). Never show the generate label on submit.
- Phase C, review: prompt and learner text stay on screen.
  - Desktop: flex row that wraps; sheet `flex: 1 1 520px`, Corrections `flex: 1 1 420px`. Mobile: Corrections under the text.
  - Corrections region is `aria-live="polite"`; move focus to it when the Evaluation arrives.
  - Order: summary count line → Corrections in text order → `Scores ▸` (collapsed by default) → CTAs.
  - Scores expand to overall CEFR + four dimensions. Dimension names in the mockup (Grammaire, Vocabulaire, Cohérence, Consigne suivie) are placeholders: use the app's existing four.
  - CTAs: `Une autre consigne · reste N` (respects quota) and a link to the Focus Weakness in the Carnet.

Correction, three kinds, visually distinct by color, underline style and marker shape

| Kind | UI label | In-text mark | Marker | Card content | Actions | Feeds Weakness memory |
|---|---|---|---|---|---|---|
| Mistake | `FAUTE` | tint fill + 2 px solid underline, `mistake` | filled round pill, white number | struck quote → correction, French explanation, Resources (one Grammaire, one Input) | `Compris`; `C'est du français louisianais` (pushback, opens Add Dialect Note) | Yes |
| Standard→Louisiana | `FRANÇAIS STANDARD` | no fill, 2 px dashed underline, `standard` | outlined round pill | quote (not struck) → Louisiana form + `DLF` attribution, explanation | `Compris` (dismiss) | No, never counted |
| Dialect check | `ÇA SE DIT COMME ÇA ?` | tint fill + wavy underline, `dialect` | squared pill, `N ?` | highlighted quote, question | `Oui, c'est à nous-autres` → Add Dialect Note; `Non, corrige-le` → becomes a Mistake | Only if answered No |

- Mistakes that match today's Focus carry a small `focus du jour` text tag.
- Resources are category-level picks from a curated catalog, not per-mistake matches. The names in the mockup (InnerFrench, Télé-Louisiane, grammar link labels) are stand-ins.
- Tutor explanations are model output in French; do not post-process them for dialect.

Add Dialect Note sheet
- `role="dialog"`, `aria-modal`, labelled by its title; Escape and the close button dismiss; focus trapped while open.
- Desktop: right-side panel 560 px over a scrim `rgba(23,33,29,0.42)`. Mobile: bottom sheet (not drawn; same content, full width).
- Fields: read-only "T'as écrit" vs "Le tuteur proposait"; editable rule (model-drafted textarea); example (text input); scope radios (this word only / the whole pattern).
- `Annuler` / `Sauver la note`. On save: note appears in Carnet, the mark on the text clears, the tutor does not flag that form again.

Carnet, two lists on one page; no charts, stat strips or pill clusters
- `À travailler` (Weaknesses): name, `N fois · vu <date> · <trend>`, Resources, `Pratiquer ça` (biases the next prompt). Trend values: `actif`, `en progrès`, `tranquille`.
- `Mon français louisianais` (Dialect Notes): rule, example (italic), `date · source session · scope`, `Modifier` / `Supprimer`, plus `Ajouter une note`.

History
- Rows titled by Focus, with date, status and Mistake count underneath. Never title by truncated prompt alone.
- Three statuses, distinguished by glyph and text weight: evaluated (filled dot), draft abandoned (hollow dot, `Brouillon laissé de côté`), prompt unused (short dash, not expandable).
- Expanded row: prompt, text excerpt with a link to the full marked-up text, Corrections summary by kind.
- Incomplete or malformed session data renders an inline notice in that row; the list must never blank or crash.
- Level progression is one quiet line under the title.

Placement Test, first run only
- Start → three steps → result. Progress is a 3-segment bar with `role="progressbar"`.
- Step uses the same textarea as Home; word count shown without a target.
- Result: large CEFR level, one-sentence summary, one line per step, then `Ma première consigne` lands on Home.

States (`States.dc.html`)
- AI failure: `role="alert"`, retry button, text untouched.
- Offline / fetch failure: calm notice + `Réessayer`; draft kept locally; no indefinite skeleton.
- Quota exhausted: calm notice with time to reset; generate/swap disabled; existing draft can still be submitted (`HomeQuota.dc.html`).
- Level advancement: brief banner with an undo link; clears on next generate.

Motion, three moments only (described, not animated in the mockups)
1. Prompt fades up when generated.
2. Marks paint left to right when the Evaluation lands.
3. Dialect Note sheet slides in.
Respect `prefers-reduced-motion`.

Accessibility
- Real `<button>`, `<a>`, `<label>` + `<input>`/`<textarea>` throughout; icon-only buttons have `aria-label`.
- Text contrast ≥ 4.5:1 with the tokens above; kinds never rely on hue alone.
- `aria-live` for Evaluation arrival; focus moves to results; Escape closes menus and sheets.

## UI copy (French, Louisiana register)

Domain label → UI string: Writing Prompt → `Consigne d'écriture`; Student Writing → `Ton texte`; Evaluation → `Évaluation`; Mistake → `Faute`; Standard→Louisiana → `Français standard`; Dialect check → `Ça se dit comme ça ?`; Dialect Note → `Note de dialecte`; Weaknesses → `À travailler`; Focus → `Focus du jour`; History → `Historique`; Placement Test → `Test de placement`; CEFR → `CECR`.

Avoid in copy: essay, submission, grading, marking, topic, quiz, Creole.

## Open items for the product owner

- App name: "Lâche pas." is a placeholder.
- Louisiana French in the mockups (sample text, corrections, tutor voice, UI strings) was written by the designer model and has not been checked against the Dictionary of Louisiana French.
- The four score dimension names.
- The Resource catalog contents.
- Mobile layout of the Dialect Note sheet, level-change menu, and Placement/Carnet/History at phone width were not drawn; pages are fluid and wrap, but confirm at 390 px.
