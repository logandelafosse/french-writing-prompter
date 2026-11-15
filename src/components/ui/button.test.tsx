import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function TrivialLabel() {
  return <span data-testid="label">Bonjour</span>;
}

describe("jsdom + jest-dom", () => {
  it("renders an element in the document", () => {
    render(<TrivialLabel />);
    expect(screen.getByTestId("label")).toBeInTheDocument();
  });
});
