import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuotaNotice } from "./notice";

describe("QuotaNotice", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the countdown and the draft sentence when a session is active", () => {
    render(
      <QuotaNotice
        resetsAt="2026-11-15T06:00:00.000Z"
        hasActiveSession
        now={() => new Date("2026-11-15T04:14:00.000Z")}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(
      "T'as pris tes trois consignes pour aujourd'hui.",
    );
    expect(status).toHaveTextContent(
      "La prochaine arrive à minuit, dans 1 h 46.",
    );
    expect(status).toHaveTextContent(
      "Ton brouillon reste icitte : tu peux le finir et l'envoyer quand tu veux.",
    );
  });

  it("omits the draft sentence when there is no active session", () => {
    render(
      <QuotaNotice
        resetsAt="2026-11-15T06:00:00.000Z"
        hasActiveSession={false}
        now={() => new Date("2026-11-15T05:55:00.000Z")}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("dans 0 h 05");
    expect(status).not.toHaveTextContent("Ton brouillon reste icitte");
  });

  it("refreshes the countdown each minute", () => {
    vi.useFakeTimers();
    let current = new Date("2026-11-15T04:14:00.000Z");
    render(
      <QuotaNotice
        resetsAt="2026-11-15T06:00:00.000Z"
        hasActiveSession
        now={() => current}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("dans 1 h 46");
    current = new Date("2026-11-15T05:14:00.000Z");
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("dans 0 h 46");
  });
});
