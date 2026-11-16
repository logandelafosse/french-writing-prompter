import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WordMeter } from "./word-meter";

describe("WordMeter", () => {
  it("renders N mots with no track when target is null", () => {
    render(<WordMeter text="bonjour monde" layout="desktop" target={null} />);
    expect(
      screen.getByText(
        (_, node) =>
          node instanceof HTMLSpanElement && node.textContent === "2 mots",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\d+–\d+ mots/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
  });

  it("renders a track when target is set", () => {
    render(
      <WordMeter text="un" layout="mobile" target={{ min: 10, max: 20 }} />,
    );
    expect(screen.getByText(/\/ 10–20 mots/)).toBeInTheDocument();
  });
});
