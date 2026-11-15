import { describe, it, expect } from "vitest";
import { getAllSessions, sessionCount } from "@/modules/history-store/history-store";

describe("test DB isolation (file B)", () => {
  it("does not see sessions written in file A", async () => {
    expect(await sessionCount()).toBe(0);
    const all = await getAllSessions();
    expect(all.some((s) => s.promptText === "isolation-marker-file-a")).toBe(
      false,
    );
  });
});