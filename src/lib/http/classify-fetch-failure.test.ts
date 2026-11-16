import { describe, expect, it } from "vitest";
import { classifyFetchFailure } from "./classify-fetch-failure";

describe("classifyFetchFailure distinguishes offline, AI failure and generic errors", () => {
  it("maps TypeError to offline", () => {
    expect(classifyFetchFailure(new TypeError("Failed to fetch"))).toBe(
      "offline",
    );
  });

  it("maps an AI_* envelope to AI failure", () => {
    expect(
      classifyFetchFailure(
        undefined,
        JSON.stringify({
          error: { code: "AI_UNAVAILABLE", message: "fail" },
        }),
      ),
    ).toBe("ai");
    expect(
      classifyFetchFailure(
        undefined,
        JSON.stringify({
          error: { code: "AI_TIMEOUT", message: "slow" },
        }),
      ),
    ).toBe("ai");
  });

  it("maps other envelopes to generic error", () => {
    expect(
      classifyFetchFailure(
        undefined,
        JSON.stringify({
          error: { code: "INTERNAL", message: "boom" },
        }),
      ),
    ).toBe("generic");
  });

  it("maps a non-JSON body to generic error", () => {
    expect(classifyFetchFailure(undefined, "<html>oops</html>")).toBe(
      "generic",
    );
  });
});
