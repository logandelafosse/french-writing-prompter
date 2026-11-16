import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cefrSubLevelFromScore } from "@/contracts/cefr";
import { reviewCopy } from "@/copy/review";
import { ScoresDisclosure } from "./scores-disclosure";

const evaluation = {
  overallCefr: "B1" as const,
  nextLevelTip: "Pour atteindre B2, varie tes connecteurs.",
  dimensions: {
    grammatical_accuracy: { score: 4, comment: "Quelques accords à revoir." },
    vocabulary: { score: 3, comment: "Vocabulaire suffisant." },
    coherence: { score: 4, comment: "Le récit se suit." },
    register_style: { score: 3, comment: "Registre familier respecté." },
  },
};

describe("cefrSubLevelFromScore", () => {
  it("maps the documented 1–6 table to CECR sub-levels", () => {
    expect(cefrSubLevelFromScore(1)).toBe("A1");
    expect(cefrSubLevelFromScore(2)).toBe("A2");
    expect(cefrSubLevelFromScore(3)).toBe("A2+");
    expect(cefrSubLevelFromScore(4)).toBe("B1");
    expect(cefrSubLevelFromScore(5)).toBe("B1+");
    expect(cefrSubLevelFromScore(6)).toBe("B2");
    expect(cefrSubLevelFromScore(0)).toBeNull();
  });
});

describe("ScoresDisclosure", () => {
  it("starts collapsed and shows French labels with CECR chips and the tip", async () => {
    const user = userEvent.setup();
    render(<ScoresDisclosure evaluation={evaluation} />);

    const toggle = screen.getByRole("button", { name: /Scores/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByText(reviewCopy.scoresOverall("B1")),
    ).toBeInTheDocument();
    expect(screen.queryByText("Grammaire")).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Grammaire/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Vocabulaire/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Cohérence/ })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Registre et style/ }),
    ).toBeVisible();
    expect(screen.getAllByText("A2+")).toHaveLength(2);
    expect(screen.getAllByText("B1").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText("Pour atteindre B2, varie tes connecteurs."),
    ).toBeVisible();
  });

  it("focusing a row reveals the category definition and Pour monter text", async () => {
    const user = userEvent.setup();
    render(<ScoresDisclosure evaluation={evaluation} />);
    await user.click(screen.getByRole("button", { name: /Scores/ }));

    expect(
      screen.queryByText(reviewCopy.dimensionDefinition.register_style),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Registre et style/ }));

    expect(
      screen.getByText(reviewCopy.dimensionDefinition.register_style),
    ).toBeVisible();
    expect(screen.getByText(reviewCopy.pourMonter)).toBeVisible();
    expect(screen.getByText("Registre familier respecté.")).toBeVisible();
  });
});
