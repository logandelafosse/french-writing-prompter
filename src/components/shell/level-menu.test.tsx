import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LevelMenu, nextLevelFromMenuValue } from "./header-shell";

const { emitHolder } = vi.hoisted(() => ({
  emitHolder: {
    current: undefined as ((value: string) => void) | undefined,
  },
}));

vi.mock("@base-ui/react/menu", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@base-ui/react/menu")>();
  function RadioGroup(props: ComponentProps<typeof actual.Menu.RadioGroup>) {
    emitHolder.current = (value: string) => {
      props.onValueChange?.(value, undefined as never);
    };
    return <actual.Menu.RadioGroup {...props} />;
  }
  return {
    ...actual,
    Menu: { ...actual.Menu, RadioGroup },
  };
});

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

  it("does not call onChange when the menu reports an invalid value", () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<LevelMenu level="B1" onChange={onChange} open />);
    expect(emitHolder.current).toEqual(expect.any(Function));
    act(() => {
      emitHolder.current?.("Z9");
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      emitHolder.current?.("C1");
    });
    expect(onChange).toHaveBeenCalledWith("C1");
  });
});
