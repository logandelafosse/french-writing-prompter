import { describe, expect, it } from "vitest";
import { first } from "./first";

describe("first", () => {
  it("returns the first row when present", () => {
    expect(first([{ id: 1 }], "demo")).toEqual({ id: 1 });
  });

  it("throws a named error when the result set is empty", () => {
    expect(() => first([], "daily_quota for 2026-01-01")).toThrow(
      "No row found: daily_quota for 2026-01-01",
    );
  });
});
