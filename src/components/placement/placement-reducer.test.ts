import { describe, expect, it } from "vitest";
import type { PlacementResultView } from "@/contracts/placement";
import {
  initialPlacementState,
  reducePlacement,
  type PlacementStepModel,
} from "./placement-reducer";

const step1: PlacementStepModel = {
  runId: 1,
  step: 1,
  sessionId: 10,
  prompt: "Première.",
  text: "",
  savedAt: null,
};

const step2: PlacementStepModel = {
  ...step1,
  step: 2,
  sessionId: 11,
  prompt: "Deuxième.",
};

const step3: PlacementStepModel = {
  ...step1,
  step: 3,
  sessionId: 12,
  prompt: "Troisième.",
};

const result: PlacementResultView = {
  finalLevel: "B1",
  levelName: "Seuil",
  summary: "Tu racontes.",
  steps: [
    {
      step: 1,
      promptLevel: "A2",
      evaluatedLevel: "A2",
      summary: "s1",
      mistakeCount: 0,
    },
    {
      step: 2,
      promptLevel: "B1",
      evaluatedLevel: "B1",
      summary: "s2",
      mistakeCount: 0,
    },
    {
      step: 3,
      promptLevel: "B2",
      evaluatedLevel: "B1",
      summary: "s3",
      mistakeCount: 1,
    },
  ],
};

describe("placement reducer", () => {
  it("moves start → step 1 → 2 → 3 → done", () => {
    let state = reducePlacement(initialPlacementState, { type: "showStart" });
    expect(state.phase).toBe("start");
    state = reducePlacement(state, { type: "startBusy" });
    state = reducePlacement(state, { type: "opened", model: step1 });
    expect(state.phase === "step" && state.step === 1).toBe(true);
    state = reducePlacement(state, { type: "opened", model: step2 });
    expect(state.phase === "step" && state.step === 2).toBe(true);
    state = reducePlacement(state, { type: "opened", model: step3 });
    expect(state.phase === "step" && state.step === 3).toBe(true);
    state = reducePlacement(state, { type: "finished", result });
    expect(state.phase).toBe("done");
  });

  it("failed submit keeps step and text", () => {
    let state = reducePlacement(initialPlacementState, {
      type: "opened",
      model: step1,
    });
    state = reducePlacement(state, { type: "typed", text: "bonjour icitte" });
    state = reducePlacement(state, { type: "submitBusy" });
    state = reducePlacement(state, { type: "submitFailed", error: "ai" });
    expect(state.phase).toBe("step");
    if (state.phase !== "step") return;
    expect(state.step).toBe(1);
    expect(state.text).toBe("bonjour icitte");
    expect(state.submit).toBe("error");
    expect(state.error).toBe("ai");
    state = reducePlacement(state, { type: "submitBusy" });
    if (state.phase !== "step") return;
    expect(state.error).toBeNull();
    expect(state.submit).toBe("evaluating");
    expect(state.text).toBe("bonjour icitte");
  });
});
