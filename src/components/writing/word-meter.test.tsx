import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WordMeter } from "./word-meter";
import { wordMeterFillRatio } from "@/lib/word-meter-math";
describe("WordMeter", () => {
  it("renders N mots with no track when target is null", () => {
    render(<WordMeter text="bonjour monde" layout="desktop" target={null} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/mots/)).toBeInTheDocument();
  });
  it("caps fill", () => expect(wordMeterFillRatio(2000, 300)).toBe(1));
});
