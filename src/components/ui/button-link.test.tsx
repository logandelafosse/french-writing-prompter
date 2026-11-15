import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ButtonLink } from "./button-link";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ButtonLink", () => {
  it("navigates to its href", () => {
    render(<ButtonLink href="/placement">Commencer</ButtonLink>);
    const link = screen.getByRole("link", { name: "Commencer" });
    expect(link).toHaveAttribute("href", "/placement");
  });
});
