import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { FocusItem } from "@/contracts/focus";
import { homeCopy } from "@/copy/fr";
import { FocusLine } from "./focus-line";

const focus: FocusItem[] = [
  {
    id: "infinitif_participe",
    name: "Infinitif ou participe (\u2011er / \u2011é)",
    inlineName: "infinitif ou participe (\u2011er / \u2011é)",
    historyName: "Infinitif ou participe",
    shortName: "\u2011er / \u2011é",
  },
  {
    id: "imparfait_pc",
    name: "Imparfait ou passé composé",
    inlineName: "imparfait ou passé composé",
    historyName: "Imparfait ou passé composé",
    shortName: "imparfait / PC",
  },
];

describe("FocusLine", () => {
  it("renders nothing when Focus is empty", () => {
    const { container } = render(<FocusLine focus={[]} variant="inline" />);
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByRole("region", { name: homeCopy.focusLabel }),
    ).not.toBeInTheDocument();
  });

  it("joins inline names with a middot", () => {
    render(<FocusLine focus={focus} variant="inline" />);
    expect(
      screen.getByRole("region", { name: homeCopy.focusLabel }),
    ).toHaveTextContent(
      "infinitif ou participe (\u2011er / \u2011é) · imparfait ou passé composé",
    );
  });

  it("shows capitalized names, reason, generate and Carnet link in hero", () => {
    render(
      <FocusLine
        focus={focus}
        variant="hero"
        generate={{
          onGenerate: vi.fn(),
          generating: false,
          disabled: false,
        }}
      />,
    );
    expect(
      screen.getByText("Infinitif ou participe (\u2011er / \u2011é)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Imparfait ou passé composé")).toBeInTheDocument();
    expect(screen.getByText(homeCopy.focusReasonAuto)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: homeCopy.generate }),
    ).toBeEnabled();
    expect(
      screen.getByRole("link", { name: homeCopy.focusChange }),
    ).toHaveAttribute("href", "/carnet");
  });
});
