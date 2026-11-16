import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AppHeader } from "./header-shell";

const defaultQuota = {
  remaining: 3,
  used: 0,
  max: 3,
  resetsAt: "2099-01-01T06:00:00.000Z",
};

describe("AppHeader full variant mobile rows", () => {
  it("renders wordmark and level chip in the header", () => {
    render(
      <AppHeader
        variant="full"
        level="B1"
        quota={defaultQuota}
        levelReady
        quotaReady
        onLevelChange={async () => {}}
      />,
    );

    const header = within(screen.getByRole("banner"));
    const wordmark = header.getByRole("link", { name: /^Consigne/ });
    expect(wordmark).toBeInTheDocument();
    expect(wordmark).toHaveClass("min-h-touch");
    expect(
      header.getByRole("button", { name: "Niveau CECR B1, changer" }),
    ).toBeInTheDocument();
  });
});

describe("AppHeader placement variant", () => {
  it("renders wordmark and placement link without nav, quota or chip", () => {
    render(
      <AppHeader
        variant="placement"
        level={null}
        quota={null}
        levelReady
        quotaReady
        placementLink={{
          href: "/placement",
          label: "Je connais mon niveau",
        }}
      />,
    );

    const wordmark = screen.getByRole("link", { name: /Consigne/ });
    expect(wordmark).toBeInTheDocument();
    expect(wordmark).toHaveClass("min-h-touch");
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
