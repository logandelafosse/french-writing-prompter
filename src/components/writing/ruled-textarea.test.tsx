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

  it("shows a 2px primary ring with 2px offset on the field while focused", () => {
    render(<RuledTextarea label="Ton texte" value="" onChange={vi.fn()} />);
    const area = screen.getByLabelText("Ton texte");
    expect(area.className).toMatch(/outline-none/);
    /* eslint-disable testing-library/no-node-access -- reason: the ring lives on the field wrapper so the lined textarea can keep outline:none */
    const wrap = area.parentElement;
    /* eslint-enable testing-library/no-node-access -- reason: end of wrapper class asserts */
    expect(wrap?.className).toMatch(/focus-within:outline-2/);
    expect(wrap?.className).toMatch(/focus-within:outline-offset-2/);
    expect(wrap?.className).toMatch(/focus-within:outline-primary/);
  });
});
