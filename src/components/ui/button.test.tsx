import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

const VARIANTS = [
  "primary",
  "secondary",
  "secondary-strong",
  "outline-primary",
  "outline-dialect",
  "dialect",
  "text",
  "quiet",
  "quiet-ink",
] as const;

describe("Button", () => {
  it("is a real button and defaults to type=button", () => {
    render(<Button>Envoyer</Button>);
    const control = screen.getByRole("button", { name: "Envoyer" });
    expect(control.tagName).toBe("BUTTON");
    expect(control).toHaveAttribute("type", "button");
  });

  it("honours type=submit", () => {
    render(<Button type="submit">Continuer</Button>);
    expect(screen.getByRole("button", { name: "Continuer" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it.each(VARIANTS)(
    "variant %s renders a button with type=button",
    (variant) => {
      const { unmount } = render(<Button variant={variant}>Action</Button>);
      expect(screen.getByRole("button", { name: "Action" })).toHaveAttribute(
        "type",
        "button",
      );
      unmount();
    },
  );

  it("busy button is disabled, announces aria-busy, and ignores clicks", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button busy onClick={onClick}>
        Patiente…
      </Button>,
    );
    const control = screen.getByRole("button", { name: "Patiente…" });
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute("aria-busy", "true");
    await user.click(control);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not set aria-busy when not busy", () => {
    render(<Button>Pas occupé</Button>);
    expect(
      screen.getByRole("button", { name: "Pas occupé" }),
    ).not.toHaveAttribute("aria-busy");
  });
});
