import { describe, it, expect, beforeEach } from "vitest";
import { CefrTracker } from "./cefr-tracker";

function makeCefrTracker(): CefrTracker {
  return new CefrTracker();
}

describe("CefrTracker", () => {
  let tracker: CefrTracker;

  beforeEach(() => {
    tracker = makeCefrTracker();
  });

  describe("getLevel", () => {
    it("returns null when no level has been set", () => {
      expect(tracker.getLevel()).toBeNull();
    });

    it("returns the current level after setting", () => {
      tracker.setLevel("A1", "manual");
      expect(tracker.getLevel()).toBe("A1");
    });
  });

  describe("setLevel", () => {
    it("sets the level and records a LevelChange", () => {
      const change = tracker.setLevel("B1", "manual");

      expect(change).toMatchObject({
        fromLevel: null,
        toLevel: "B1",
        source: "manual",
      });
      expect(change.createdAt).toBeTruthy();
      expect(tracker.getLevel()).toBe("B1");
    });

    it("records a change with fromLevel when changing from existing level", () => {
      tracker.setLevel("A1", "manual");
      const change = tracker.setLevel("A2", "auto");

      expect(change).toMatchObject({
        fromLevel: "A1",
        toLevel: "A2",
        source: "auto",
      });
    });

    it("resets the consecutive above-level counter on manual override", () => {
      tracker.setLevel("A1", "manual");
      tracker.recordEvaluation({ overallCefr: "A2" });
      tracker.recordEvaluation({ overallCefr: "A2" });

      tracker.setLevel("A2", "manual");

      tracker.recordEvaluation({ overallCefr: "B1" });
      expect(tracker.getLevel()).toBe("A2");
    });
  });

  describe("recordEvaluation", () => {
    it("returns null when eval is at current level", () => {
      tracker.setLevel("B1", "manual");
      const result = tracker.recordEvaluation({ overallCefr: "B1" });
      expect(result).toBeNull();
    });

    it("returns null when eval is below current level", () => {
      tracker.setLevel("B1", "manual");
      const result = tracker.recordEvaluation({ overallCefr: "A2" });
      expect(result).toBeNull();
    });

    it("returns null after 1 above-level evaluation", () => {
      tracker.setLevel("A1", "manual");
      const result = tracker.recordEvaluation({ overallCefr: "A2" });
      expect(result).toBeNull();
    });

    it("returns null after 2 above-level evaluations", () => {
      tracker.setLevel("A1", "manual");
      tracker.recordEvaluation({ overallCefr: "A2" });
      const result = tracker.recordEvaluation({ overallCefr: "A2" });
      expect(result).toBeNull();
    });

    it("returns a promotion after 3 consecutive above-level evaluations", () => {
      tracker.setLevel("A1", "manual");
      tracker.recordEvaluation({ overallCefr: "A2" });
      tracker.recordEvaluation({ overallCefr: "B1" });
      const result = tracker.recordEvaluation({ overallCefr: "A2" });

      expect(result).not.toBeNull();
      if (result === null) throw new Error("expected promotion");
      expect(result.toLevel).toBe("A2");
      expect(result.fromLevel).toBe("A1");
      expect(result.source).toBe("auto");
      expect(tracker.getLevel()).toBe("A2");
    });

    it("resets the consecutive counter when an evaluation is at or below current level", () => {
      tracker.setLevel("B1", "manual");
      tracker.recordEvaluation({ overallCefr: "B2" });
      tracker.recordEvaluation({ overallCefr: "B2" });
      tracker.recordEvaluation({ overallCefr: "B1" });

      const result = tracker.recordEvaluation({ overallCefr: "B2" });
      expect(result).toBeNull();
    });

    it("advances only one level at a time even if eval is much higher", () => {
      tracker.setLevel("A1", "manual");
      tracker.recordEvaluation({ overallCefr: "C1" });
      tracker.recordEvaluation({ overallCefr: "C1" });
      const result = tracker.recordEvaluation({ overallCefr: "C1" });

      expect(result).not.toBeNull();
      if (result === null) throw new Error("expected promotion");
      expect(result.toLevel).toBe("A2");
      expect(tracker.getLevel()).toBe("A2");
    });

    it("does not advance past C2", () => {
      tracker.setLevel("C2", "manual");
      tracker.recordEvaluation({ overallCefr: "C2" });
      tracker.recordEvaluation({ overallCefr: "C2" });
      const result = tracker.recordEvaluation({ overallCefr: "C2" });

      expect(result).toBeNull();
      expect(tracker.getLevel()).toBe("C2");
    });

    it("resets counter after a successful promotion", () => {
      tracker.setLevel("A1", "manual");
      tracker.recordEvaluation({ overallCefr: "A2" });
      tracker.recordEvaluation({ overallCefr: "B1" });
      tracker.recordEvaluation({ overallCefr: "B1" });

      expect(tracker.getLevel()).toBe("A2");

      const result = tracker.recordEvaluation({ overallCefr: "B1" });
      expect(result).toBeNull();
    });
  });

  describe("advancement scenarios", () => {
    it("simulates 3 above-level evaluations → auto-promotes", () => {
      tracker.setLevel("B1", "manual");

      tracker.recordEvaluation({ overallCefr: "B2" });
      tracker.recordEvaluation({ overallCefr: "B2" });
      const result = tracker.recordEvaluation({ overallCefr: "B2" });

      expect(result).not.toBeNull();
      if (result === null) throw new Error("expected promotion");
      expect(result.toLevel).toBe("B2");
      expect(result.source).toBe("auto");
      expect(tracker.getLevel()).toBe("B2");
    });

    it("simulates 2 above-level then 1 below → no promotion, counter resets", () => {
      tracker.setLevel("B1", "manual");

      tracker.recordEvaluation({ overallCefr: "B2" });
      tracker.recordEvaluation({ overallCefr: "B2" });
      tracker.recordEvaluation({ overallCefr: "B1" });

      const result = tracker.recordEvaluation({ overallCefr: "B2" });
      expect(result).toBeNull();
      expect(tracker.getLevel()).toBe("B1");
    });

    it("manual level change resets consecutive counter", () => {
      tracker.setLevel("A1", "manual");
      tracker.recordEvaluation({ overallCefr: "A2" });
      tracker.recordEvaluation({ overallCefr: "A2" });

      tracker.setLevel("A2", "manual");

      tracker.recordEvaluation({ overallCefr: "B1" });
      expect(tracker.getLevel()).toBe("A2");
    });

    it("C2 is a ceiling — no advancement past C2", () => {
      tracker.setLevel("C2", "manual");

      tracker.recordEvaluation({ overallCefr: "C2" });
      tracker.recordEvaluation({ overallCefr: "C2" });
      const result = tracker.recordEvaluation({ overallCefr: "C2" });

      expect(result).toBeNull();
      expect(tracker.getLevel()).toBe("C2");
    });
  });

  describe("getHistory", () => {
    it("returns empty array with no changes", () => {
      expect(tracker.getHistory()).toEqual([]);
    });

    it("returns all level changes in order", () => {
      tracker.setLevel("A1", "manual");
      tracker.setLevel("A2", "auto");
      tracker.setLevel("B1", "manual");

      const history = tracker.getHistory();
      expect(history).toHaveLength(3);
      const [firstChange, secondChange, thirdChange] = history;
      expect(firstChange?.toLevel).toBe("A1");
      expect(secondChange?.toLevel).toBe("A2");
      expect(thirdChange?.toLevel).toBe("B1");
    });
  });
});
