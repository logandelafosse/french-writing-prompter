import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "./app-header";

describe("AppHeader placement variant", () => {
  it("renders wordmark and placement link without nav, quota or chip", () => {
    render(
      <AppHeader
        variant="placement"
        level={null}
        quota={null}
        placementLink={{
          href: "/placement",
          label: "Je connais mon niveau",
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "Consigne." })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Je connais mon niveau" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByText(/consignes/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Niveau CECR/ }),
    ).not.toBeInTheDocument();
  });
});
