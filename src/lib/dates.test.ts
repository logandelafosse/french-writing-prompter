import { afterEach, describe, expect, it, vi } from "vitest";
import { formatFrenchDate, formatFrenchTime, localDateKey } from "./dates";

describe("localDateKey", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the local calendar day under America/Chicago at 21:30", () => {
    vi.setSystemTime(new Date("2026-11-14T21:30:00-06:00"));
    expect(localDateKey(new Date(), "America/Chicago")).toBe("2026-11-14");
  });
});

describe("French date and time formatters", () => {
  it("formats weekday, month, and time for Chicago", () => {
    const when = new Date("2026-11-14T21:42:00-06:00");
    expect(formatFrenchDate(when, "America/Chicago")).toBe(
      "samedi 14 novembre",
    );
    expect(formatFrenchTime(when, "America/Chicago")).toBe("21 h 42");
  });
});
