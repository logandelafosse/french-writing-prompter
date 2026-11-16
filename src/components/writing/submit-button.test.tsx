import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { homeCopy } from "@/copy/fr";
import { GenerateButton } from "./generate-button";
import { SubmitButton, isSubmitDisabled } from "./submit-button";
describe("SubmitButton", () => {
  it("word meter never disables submit and only empty or busy blocks send", () => {
    expect(isSubmitDisabled("un", false)).toBe(false);
    expect(isSubmitDisabled("", false)).toBe(true);
  });
  it("submit and generate busy labels are independent", () => {
    render(
      <>
        <GenerateButton
          busy
          onClick={() => undefined}
          label={homeCopy.generate}
        />
        <SubmitButton busy={false} onClick={() => undefined} />
      </>,
    );
    expect(
      screen.getByRole("button", { name: homeCopy.generateBusy }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: homeCopy.submit })).toBeEnabled();
  });

  it("shows Réessayer after an evaluation error", () => {
    render(<SubmitButton busy={false} retry onClick={() => undefined} />);
    expect(
      screen.getByRole("button", { name: homeCopy.retry }),
    ).toBeInTheDocument();
  });
});
