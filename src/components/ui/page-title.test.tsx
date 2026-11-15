import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageTitle } from "./page-title";

describe("PageTitle", () => {
  it("renders a page heading", () => {
    render(<PageTitle>Lâche pas.</PageTitle>);
    expect(
      screen.getByRole("heading", { level: 1, name: "Lâche pas." }),
    ).toBeInTheDocument();
  });
});
