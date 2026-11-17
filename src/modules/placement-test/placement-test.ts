import { PLACEMENT_STEPS } from "@/config/limits";
import { CEFR_ORDER, CEFR_UI_LABELS, type CefrLevel } from "@/contracts/cefr";
import { countsAsMistake, type Correction } from "@/contracts/correction";
import type { PlacementResultView } from "@/contracts/placement";

const STARTING_LEVELS: CefrLevel[] = ["A2", "B1", "B2"];

export function stepLevel(step: number): CefrLevel {
  const level = STARTING_LEVELS[step - 1];
  if (level === undefined) {
    throw new Error(`No starting level for placement step ${step}`);
  }
  return level;
}

export function computeLevel(cefrLevels: CefrLevel[]): CefrLevel {
  const sorted = [...cefrLevels].sort((a, b) => CEFR_ORDER[a] - CEFR_ORDER[b]);
  const median = sorted[1];
  if (median === undefined) {
    throw new Error("computeLevel requires at least two CEFR levels");
  }
  return median;
}

// prettier-ignore
export function buildResults(
  run: { finalLevel: CefrLevel },
  sessions: readonly {
    step: number; promptLevel: CefrLevel; evaluatedLevel: CefrLevel;
    summary: string; nextLevelTip: string;
    corrections: ReadonlyArray<Pick<Correction, "kind" | "status">>;
  }[],
): PlacementResultView {
  const ordered = [...sessions].sort((a, b) => a.step - b.step);
  const last = ordered[ordered.length - 1];
  if (ordered.length !== PLACEMENT_STEPS || last === undefined) {
    throw new Error("buildResults requires three evaluated sessions");
  }
  return {
    finalLevel: run.finalLevel,
    levelName: CEFR_UI_LABELS[run.finalLevel],
    summary: last.nextLevelTip,
    steps: ordered.map((session) => ({
      step: session.step, promptLevel: session.promptLevel,
      evaluatedLevel: session.evaluatedLevel, summary: session.summary,
      mistakeCount: session.corrections.filter(countsAsMistake).length,
    })),
  };
}
