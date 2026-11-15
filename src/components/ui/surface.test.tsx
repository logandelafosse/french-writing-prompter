import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Surface } from "./surface";

describe("Surface", () => {
  it("renders its children", () => {
    render(<Surface>Contenu</Surface>);
    expect(screen.getByText("Contenu")).toBeInTheDocument();
  });
});
