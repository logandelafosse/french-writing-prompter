import { describe, it, expect } from "vitest";
import {
  getAllSessions,
  saveSession,
  sessionCount,
} from "@/modules/history-store/history-store";

const MARKER_A = "isolation-marker-file-a";
const MARKER_B = "isolation-marker-file-b";

describe("test DB isolation (file A)", () => {
  it("sees only its own session", async () => {
    await saveSession({
      promptText: MARKER_A,
      promptConstraints: "{}",
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A1",
    });

    expect(await sessionCount()).toBe(1);
    const all = await getAllSessions();
    expect(all.some((s) => s.promptText === MARKER_A)).toBe(true);
    expect(all.some((s) => s.promptText === MARKER_B)).toBe(false);
  });
});