import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Correction } from "@/contracts/correction";
import { MarkedText } from "./marked-text";

const text = "Bonjour.\n\nLes enfant jouent.";
const mistakeStart = text.indexOf("Les enfant");

function correction(
  partial: Pick<Correction, "id" | "ordinal" | "kind"> &
    Partial<Pick<Correction, "span" | "status">>,
): Pick<Correction, "id" | "ordinal" | "kind" | "span" | "status"> {
  return {
    span: null,
    status: "open",
    ...partial,
  };
}

describe("MarkedText", () => {
  it("marked text wraps mistake spans and skips unanchored corrections", () => {
    render(
      <MarkedText
        text={text}
        corrections={[
          correction({
            id: "m1",
            ordinal: 1,
            kind: "mistake",
            span: {
              start: mistakeStart,
              end: mistakeStart + "Les enfant".length,
            },
          }),
          correction({ id: "u1", ordinal: 2, kind: "mistake" }),
          correction({
            id: "s1",
            ordinal: 3,
            kind: "standard",
            span: { start: 0, end: 7 },
          }),
          correction({
            id: "d1",
            ordinal: 4,
            kind: "dialect_check",
            span: { start: 0, end: 7 },
          }),
        ]}
      />,
    );

    const mark = screen.getByText("Les enfant");
    expect(mark).toHaveClass("bg-mistake-tint");
    expect(mark).toHaveTextContent("Les enfant");
    expect(screen.getByText("Bonjour.")).toBeVisible();
    expect(screen.getAllByRole("link", { name: /faute/ })).toHaveLength(1);

    const hidden = screen.getByText("(faute 1)");
    expect(hidden).toHaveClass("sr-only");

    const link = screen.getByRole("link", { name: "faute 1" });
    expect(link).toHaveAttribute("href", "#correction-1");
  });
});
