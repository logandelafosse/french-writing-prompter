import type { CefrLevel } from "@/contracts/cefr";

export const DAILY_PROMPT_QUOTA = 3;

/** Student Writing autosave body limit and debounce. */
export const DRAFT_TEXT_MAX = 20_000;

export const DRAFT_AUTOSAVE_MS = 1_500;

export const FETCH_TIMEOUT_MS = 10_000;

export const PLACEMENT_STEPS = 3;

/** Q8: Placement Mistakes feed Weakness memory. Flip to false to exclude them. */
export const PLACEMENT_FEEDS_WEAKNESS_MEMORY = true;

export const ADVANCEMENT_STREAK = 3;

/** Per-dimension Evaluation score range (1–max). */
export const EVALUATION_SCORE_MAX = 6;

/** Max Corrections the evaluator may return per Evaluation. */
export const EVALUATOR_CORRECTIONS_MAX = 15;

export const DIALECT_NOTE_RULE_MIN = 3;
export const DIALECT_NOTE_RULE_MAX = 500;
export const DIALECT_NOTE_EXAMPLE_MAX = 300;
export const DIALECT_NOTE_FORM_MAX = 80;

/** Carnet `nouvelle` tag window. */
export const DIALECT_NOTE_NEW_MS = 24 * 60 * 60 * 1000;

/** Content words shorter than this are skipped for DLF prompt cards. */
export const DLF_HINT_MIN_LETTERS = 4;

/** Cap on DLF entries injected into the evaluator prompt (ticket: ~25–40). */
export const DLF_HINT_MAX_HITS = 32;

/**
 * Max estimated tokens of injected DLF cards (ceil(chars / 4) in
 * `estimateHintTokens`). Truncate from the end until the section fits.
 */
export const DLF_HINT_MAX_TOKENS = 400;

export const WORD_TARGET_BY_LEVEL: Record<
  CefrLevel,
  { min: number; max: number }
> = {
  A1: { min: 10, max: 20 },
  A2: { min: 80, max: 120 },
  B1: { min: 250, max: 300 },
  B2: { min: 250, max: 300 },
  C1: { min: 250, max: 300 },
  C2: { min: 250, max: 300 },
};
