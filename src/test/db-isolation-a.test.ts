import { describe, it, expect } from "vitest";
import { saveSession, sessionCount } from "@/modules/history-store/history-store";

describe("test DB isolation (file A)", () => {
  it("writes a session tagged for file A", async () => {
    await saveSession({
      promptText: "isolation-marker-file-a",
      promptConstraints: "{}",
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A1",
    });

    expect(await sessionCount()).toBe(1);
  });
});