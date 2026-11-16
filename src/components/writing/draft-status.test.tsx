import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DraftStatus } from "./draft-status";

describe("DraftStatus", () => {
  it('shows the saved time as "H h mm"', () => {
    const { rerender } = render(
      <DraftStatus savedAt="2026-11-14T21:42:00-06:00" />,
    );
    const evening = screen.getByText("Brouillon sauvé à 21 h 42");
    expect(evening).toBeInTheDocument();
    expect(evening).not.toHaveAttribute("aria-live");

    rerender(<DraftStatus savedAt="2026-11-14T09:05:00-06:00" />);
    expect(screen.getByText("Brouillon sauvé à 9 h 05")).toBeInTheDocument();

    rerender(<DraftStatus savedAt="2026-11-14T00:00:00-06:00" />);
    expect(screen.getByText("Brouillon sauvé à 0 h 00")).toBeInTheDocument();
  });
});
