import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextLink } from "./text-link";

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

describe("TextLink", () => {
  it("renders a link", () => {
    render(<TextLink href="/carnet">Voir le carnet</TextLink>);
    const link = screen.getByRole("link", { name: "Voir le carnet" });
    expect(link).toHaveAttribute("href", "/carnet");
  });
});
