import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlacementProgress } from "./placement-screens";

describe("PlacementProgress", () => {
  it("progressbar aria values for step 2", () => {
    render(<PlacementProgress step={2} />);
    const bar = screen.getByRole("progressbar", {
      name: "Avancement du test",
    });
    expect(bar).toHaveAttribute("aria-valuemin", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "3");
    // eslint-disable-next-line jest-dom/prefer-to-have-value -- progressbar uses aria-valuenow, not a form value
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuetext", "Étape 2 sur 3");
    const segments = screen.getAllByTestId("placement-progress-segment");
    expect(segments).toHaveLength(3);
    expect(segments[0]).toHaveClass("bg-primary");
    expect(segments[1]).toHaveClass("bg-primary");
    expect(segments[2]).toHaveClass("bg-line-strong");
  });
});
