import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LevelPicker } from "./home-phase-a";

describe("LevelPicker", () => {
  it("exposes six buttons with aria-pressed and a legend", () => {
    render(<LevelPicker value={null} onChange={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: /ton niveau cecr/i }),
    ).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
    for (const button of buttons) {
      expect(button).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("sets exactly one aria-pressed true after a click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LevelPicker value={null} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /B1Seuil/i }));
    expect(onChange).toHaveBeenCalledWith("B1");
  });

  it("reflects the selected value with aria-pressed", () => {
    render(<LevelPicker value="B1" onChange={vi.fn()} />);
    const pressed = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveTextContent("B1");
  });
});
