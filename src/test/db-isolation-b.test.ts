import { describe, it, expect } from "vitest";
import {
  getAllSessions,
  saveSession,
  sessionCount,
} from "@/modules/history-store/history-store";

const MARKER_A = "isolation-marker-file-a";
const MARKER_B = "isolation-marker-file-b";

describe("test DB isolation (file B)", () => {
  it("sees only its own session", async () => {
    await saveSession({
      promptText: MARKER_B,
      promptConstraints: "{}",
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A1",
    });

    expect(await sessionCount()).toBe(1);
    const all = await getAllSessions();
    expect(all.some((s) => s.promptText === MARKER_B)).toBe(true);
    expect(all.some((s) => s.promptText === MARKER_A)).toBe(false);
  });
});