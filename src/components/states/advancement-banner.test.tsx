import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdvancementBanner } from "./advancement-banner";

const advancement = {
  id: 1,
  fromLevel: "B1" as const,
  toLevel: "B2" as const,
  source: "auto" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("AdvancementBanner", () => {
  it("renders advancement copy and calls undo", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(<AdvancementBanner advancement={advancement} onUndo={onUndo} />);

    const banner = screen.getByRole("status");
    expect(
      within(banner).getByText("Te voilà en B2.", { exact: false }),
    ).toBeInTheDocument();
    expect(
      within(banner).getByRole("button", { name: "Rester en B1" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rester en B1" }));
    expect(onUndo).toHaveBeenCalledOnce();
  });
});
