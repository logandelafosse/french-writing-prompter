import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { homeCopy } from "@/copy/fr";
import { GenerateButton } from "./generate-button";

describe("GenerateButton", () => {
  it("generate button shows the generate busy label only while generating", () => {
    const { rerender } = render(
      <GenerateButton
        busy={false}
        onClick={() => undefined}
        label={homeCopy.generate}
      />,
    );
    expect(
      screen.getByRole("button", { name: homeCopy.generate }),
    ).toBeEnabled();

    rerender(
      <GenerateButton
        busy
        onClick={() => undefined}
        label={homeCopy.generate}
      />,
    );
    const busy = screen.getByRole("button", { name: homeCopy.generateBusy });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
  });
});
