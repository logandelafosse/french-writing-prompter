import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LevelMenu, nextLevelFromMenuValue } from "./header-shell";

describe("nextLevelFromMenuValue", () => {
  it("rejects invalid levels and unchanged selection", () => {
    expect(nextLevelFromMenuValue("Z9", "B1")).toBeNull();
    expect(nextLevelFromMenuValue("B1", "B1")).toBeNull();
    expect(nextLevelFromMenuValue("C1", "B1")).toBe("C1");
  });
});

describe("LevelMenu", () => {
  it("selects a level with the keyboard and restores focus on Escape", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockResolvedValue(undefined);

    render(<LevelMenu level="B1" onChange={onChange} />);

    const chip = screen.getByRole("button", {
      name: "Niveau CECR B1, changer",
    });
    await user.click(chip);

    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();

    await user.keyboard("{ArrowUp}{ArrowUp}");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("C1");

    await user.click(chip);
    await user.keyboard("{Escape}");
    expect(chip).toHaveFocus();
  });
});
