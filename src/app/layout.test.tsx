import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({ variable: "font-bricolage-var" }),
  Newsreader: () => ({ variable: "font-newsreader-var" }),
}));

import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("exports Louisiana Languages product metadata", () => {
    expect(metadata.title).toBe("Consigne · Louisiana Languages");
    expect(metadata.description).toBe(
      "atelier d'écriture · français louisianais",
    );
  });

  it('sets lang="fr" and wires both next/font variable classes on <html>', () => {
    render(
      <RootLayout>
        <span>enfant</span>
      </RootLayout>,
    );
    expect(document.documentElement).toHaveAttribute("lang", "fr");
    const className = document.documentElement.getAttribute("class") ?? "";
    expect(className).toContain("antialiased");
    expect(className).toContain("font-bricolage-var");
    expect(className).toContain("font-newsreader-var");
  });
});
