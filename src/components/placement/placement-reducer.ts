import type { ClassifiedFetchFailure } from "@/contracts/errors";
import type {
  PlacementResultView,
  PlacementRunView,
} from "@/contracts/placement";

// prettier-ignore
export type PlacementStepModel = {
  runId: number; step: 1 | 2 | 3; sessionId: number;
  prompt: string; text: string; savedAt: string | null;
};
// prettier-ignore
export type PlacementUiState =
  | { phase: "boot"; error: ClassifiedFetchFailure | null }
  | { phase: "redirect" }
  | { phase: "start"; status: "idle" | "generating" | "error"; error: ClassifiedFetchFailure | null }
  | (PlacementStepModel & { phase: "step"; submit: "idle" | "evaluating" | "error"; error: ClassifiedFetchFailure | null })
  | { phase: "done"; result: PlacementResultView };
// prettier-ignore
export type PlacementAction =
  | { type: "redirect" } | { type: "showStart" } | { type: "startBusy" }
  | { type: "opened"; model: PlacementStepModel } | { type: "typed"; text: string }
  | { type: "submitBusy" } | { type: "submitFailed"; error: ClassifiedFetchFailure }
  | { type: "finished"; result: PlacementResultView } | { type: "failed"; error: ClassifiedFetchFailure };

export const initialPlacementState: PlacementUiState = {
  phase: "boot",
  error: null,
};

export function placementStepFromRun(
  run: PlacementRunView,
): PlacementStepModel | null {
  if (run.status !== "in_progress") return null;
  const step =
    run.step === 1 || run.step === 2 || run.step === 3 ? run.step : null;
  if (step === null) return null;
  return {
    runId: run.id,
    step,
    sessionId: run.session.id,
    prompt: run.session.promptText,
    text: run.session.writingText ?? "",
    savedAt: run.session.writingSavedAt,
  };
}

// prettier-ignore
export function reducePlacement(state: PlacementUiState, action: PlacementAction): PlacementUiState {
  switch (action.type) {
    case "redirect": return { phase: "redirect" };
    case "showStart": return { phase: "start", status: "idle", error: null };
    case "startBusy": return state.phase === "start" ? { phase: "start", status: "generating", error: null } : state;
    case "opened": return { phase: "step", ...action.model, submit: "idle", error: null };
    case "typed": return state.phase === "step" ? { ...state, text: action.text } : state;
    case "submitBusy": return state.phase === "step" ? { ...state, submit: "evaluating", error: null } : state;
    case "submitFailed": return state.phase === "step" ? { ...state, submit: "error", error: action.error } : state;
    case "finished": return { phase: "done", result: action.result };
    case "failed":
      if (state.phase === "step") return { ...state, submit: "error", error: action.error };
      if (state.phase === "start") return { phase: "start", status: "error", error: action.error };
      if (state.phase === "boot") return { phase: "boot", error: action.error };
      return state;
  }
}
