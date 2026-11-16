import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RuledTextarea } from "./ruled-textarea";

describe("RuledTextarea", () => {
  it("calls onSubmitShortcut on Meta/Ctrl+Enter only", async () => {
    const user = userEvent.setup();
    const onSubmitShortcut = vi.fn();
    render(
      <RuledTextarea
        label="Ton texte"
        value=""
        onChange={vi.fn()}
        onSubmitShortcut={onSubmitShortcut}
      />,
    );
    const area = screen.getByLabelText("Ton texte");
    area.focus();
    await user.keyboard("{Enter}");
    expect(onSubmitShortcut).not.toHaveBeenCalled();
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSubmitShortcut).not.toHaveBeenCalled();
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmitShortcut).toHaveBeenCalledTimes(1);
    onSubmitShortcut.mockClear();
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(onSubmitShortcut).toHaveBeenCalledTimes(1);
  });
});
