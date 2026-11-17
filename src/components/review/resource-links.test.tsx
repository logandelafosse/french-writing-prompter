import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { reviewCopy } from "@/copy/review";
import { ResourceLinks } from "./resource-links";

const resources = [
  {
    id: "grammaire-accord",
    type: "grammaire" as const,
    label: "l'accord",
    url: "https://example.com/grammar",
  },
  {
    id: "input-innerfrench",
    type: "input" as const,
    label: "InnerFrench",
    url: "https://example.com/input",
  },
];

describe("ResourceLinks", () => {
  it("renders Grammaire and Input links that open in a new tab", () => {
    render(<ResourceLinks resources={resources} layout="row" />);
    const grammar = screen.getByRole("link", {
      name: /Grammaire · l'accord/,
    });
    const input = screen.getByRole("link", { name: /Input · InnerFrench/ });
    expect(grammar).toHaveAttribute("href", "https://example.com/grammar");
    expect(grammar).toHaveAttribute("target", "_blank");
    expect(grammar).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(grammar).toHaveTextContent(reviewCopy.newTab);
    expect(input).toHaveAttribute("target", "_blank");
    expect(input).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("renders nothing when there are no resources", () => {
    const { container } = render(
      <ResourceLinks resources={[]} layout="column" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
