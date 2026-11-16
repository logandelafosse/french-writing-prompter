import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatCountdown,
  formatFrenchDate,
  formatFrenchTime,
  localDateKey,
  nextLocalMidnightIso,
} from "./dates";

describe("localDateKey", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the local calendar day under America/Chicago at 21:30", () => {
    vi.setSystemTime(new Date("2026-11-14T21:30:00-06:00"));
    expect(localDateKey(new Date(), "America/Chicago")).toBe("2026-11-14");
  });

  it("still counts as today at 18:30 local when the UTC date has rolled", () => {
    vi.setSystemTime(new Date("2026-11-15T00:30:00.000Z"));
    expect(localDateKey(new Date(), "America/Chicago")).toBe("2026-11-14");
  });

  it("rolls to the next key just after local midnight", () => {
    vi.setSystemTime(new Date("2026-11-15T00:01:00-06:00"));
    expect(localDateKey(new Date(), "America/Chicago")).toBe("2026-11-15");
  });
});

describe("nextLocalMidnightIso", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("targets the next Chicago midnight from 23:59", () => {
    vi.setSystemTime(new Date("2026-11-14T23:59:00-06:00"));
    expect(nextLocalMidnightIso(new Date(), "America/Chicago")).toBe(
      "2026-11-15T06:00:00.000Z",
    );
  });

  it("respects DST on the spring-forward transition day", () => {
    vi.setSystemTime(new Date("2026-03-09T23:30:00-05:00"));
    expect(nextLocalMidnightIso(new Date(), "America/Chicago")).toBe(
      "2026-03-10T05:00:00.000Z",
    );
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

describe("formatCountdown", () => {
  it("renders hours and zero-padded minutes", () => {
    const resetsAt = new Date("2026-11-15T06:00:00.000Z");
    expect(
      formatCountdown(resetsAt, new Date("2026-11-15T04:14:00.000Z")),
    ).toBe("1 h 46");
    expect(
      formatCountdown(resetsAt, new Date("2026-11-15T05:55:00.000Z")),
    ).toBe("0 h 05");
  });
});
