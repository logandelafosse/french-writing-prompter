import type { CefrLevel } from "@/contracts/cefr";

export const DAILY_PROMPT_QUOTA = 3;

/** Student Writing autosave body limit and debounce. */
export const DRAFT_TEXT_MAX = 20_000;

export const DRAFT_AUTOSAVE_MS = 1_500;

export const FETCH_TIMEOUT_MS = 10_000;

export const PLACEMENT_STEPS = 3;

export const ADVANCEMENT_STREAK = 3;

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
