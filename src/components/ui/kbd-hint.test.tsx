import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KbdHint } from "./kbd-hint";

describe("KbdHint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the Apple or Ctrl shortcut and is aria-hidden", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
    });
    const { unmount } = render(<KbdHint />);
    const hint = screen.getByText("⌘ ↵");
    expect(hint).toHaveAttribute("aria-hidden", "true");
    unmount();

    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    });
    render(<KbdHint />);
    expect(screen.getByText("Ctrl ↵")).toHaveAttribute("aria-hidden", "true");
  });
});
