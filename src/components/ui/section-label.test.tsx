import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionLabel } from "./section-label";

describe("SectionLabel", () => {
  it("as legend names its fieldset with sentence-case text in the DOM", () => {
    render(
      <fieldset>
        <SectionLabel as="legend">Focus du jour</SectionLabel>
      </fieldset>,
    );
    const group = screen.getByRole("group", { name: "Focus du jour" });
    expect(group).toBeInTheDocument();
    expect(screen.getByText("Focus du jour")).toBeInTheDocument();
  });
});
