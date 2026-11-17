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
    const { container } = render(
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
          correction({ id: "s1", ordinal: 3, kind: "standard" }),
        ]}
      />,
    );

    const quote = screen.getByText("Les enfant");
    /* eslint-disable testing-library/no-container, testing-library/no-node-access -- reason: <mark> and <p> have no role; paragraph split is the contract */
    expect(quote.closest("mark")).not.toBeNull();
    expect(container.querySelectorAll("mark")).toHaveLength(1);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent("Bonjour.");
    expect(paragraphs[1]).toHaveTextContent(/Les enfant/);
    /* eslint-enable testing-library/no-container, testing-library/no-node-access -- reason: end of mark/paragraph DOM asserts */

    const hidden = screen.getByText("(faute 1)");
    expect(hidden).toHaveClass("sr-only");

    const link = screen.getByRole("link", { name: "faute 1" });
    expect(link).toHaveAttribute("href", "#correction-1");
    expect(screen.getAllByRole("link", { name: /faute/ })).toHaveLength(1);
  });

  it("standard span gets a dashed mark and outlined marker", () => {
    const quote = "ma voiture";
    const writing = `J'arrive avec ${quote}.`;
    const start = writing.indexOf(quote);
    const { container } = render(
      <MarkedText
        text={writing}
        corrections={[
          correction({
            id: "s1",
            ordinal: 1,
            kind: "standard",
            span: { start, end: start + quote.length },
          }),
          correction({ id: "u1", ordinal: 2, kind: "standard" }),
        ]}
      />,
    );

    const marked = screen.getByText(quote);
    /* eslint-disable testing-library/no-container, testing-library/no-node-access -- reason: <mark> has no role; dashed/outlined styles are the kind contract */
    expect(marked.closest("mark")).toHaveClass("border-dashed");
    expect(container.querySelectorAll("mark")).toHaveLength(1);
    /* eslint-enable testing-library/no-container, testing-library/no-node-access -- reason: end of mark DOM asserts */

    const hidden = screen.getByText("(français standard 1)");
    expect(hidden).toHaveClass("sr-only");

    const link = screen.getByRole("link", { name: "français standard 1" });
    expect(link).toHaveAttribute("href", "#correction-1");
    expect(link).toHaveClass("border-standard", "bg-white");
  });

  it("dialect span gets a wavy mark, squared marker, and clears when saved", () => {
    const quote = "a tombé";
    const writing = `Mon petit cousin ${quote} dans la boue.`;
    const start = writing.indexOf(quote);
    const span = { start, end: start + quote.length };
    const open = correction({
      id: "d1",
      ordinal: 6,
      kind: "dialect_check",
      span,
    });

    const { container, rerender } = render(
      <MarkedText text={writing} corrections={[open]} />,
    );

    const marked = screen.getByText(quote);
    /* eslint-disable testing-library/no-container, testing-library/no-node-access -- reason: <mark> has no role; wavy/squared styles are the dialect contract */
    expect(marked.closest("mark")).toHaveClass("decoration-wavy");
    expect(container.querySelectorAll("mark")).toHaveLength(1);
    /* eslint-enable testing-library/no-container, testing-library/no-node-access -- reason: end of mark DOM asserts */

    const hidden = screen.getByText("(à vérifier 6)");
    expect(hidden).toHaveClass("sr-only");
    const link = screen.getByRole("link", { name: "à vérifier 6" });
    expect(link).toHaveAttribute("href", "#correction-6");
    expect(link).toHaveTextContent("6\u202F?", { normalizeWhitespace: false });
    expect(link).toHaveClass("rounded-marker-dialect");

    rerender(
      <MarkedText
        text={writing}
        corrections={[{ ...open, status: "confirmed_dialect" }]}
      />,
    );
    expect(
      screen.queryByRole("link", { name: "à vérifier 6" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(writing)).toBeVisible();
  });

  it("resolved dialect note span renders as plain text", () => {
    const quote = "a tombé";
    const writing = `Mon petit cousin ${quote} dans la boue.`;
    const start = writing.indexOf(quote);
    const span = { start, end: start + quote.length };
    const base = correction({
      id: "d1",
      ordinal: 6,
      kind: "dialect_check",
      span,
    });

    const { rerender, container } = render(
      <MarkedText
        text={writing}
        corrections={[{ ...base, status: "overturned" }]}
      />,
    );
    /* eslint-disable testing-library/no-container, testing-library/no-node-access -- reason: unmarked resolved notes have no role; <mark> count is the contract */
    expect(container.querySelectorAll("mark")).toHaveLength(0);
    expect(screen.getByText(writing)).toBeVisible();

    rerender(
      <MarkedText
        text={writing}
        corrections={[{ ...base, status: "confirmed_dialect" }]}
      />,
    );
    expect(container.querySelectorAll("mark")).toHaveLength(0);
    /* eslint-enable testing-library/no-container, testing-library/no-node-access -- reason: end of mark DOM asserts */
    expect(screen.getByText(writing)).toBeVisible();
  });
});
