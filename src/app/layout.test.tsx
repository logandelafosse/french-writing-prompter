import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const fontLoaderOptions = vi.hoisted(() => ({
  bricolage: undefined as Record<string, unknown> | undefined,
  newsreader: undefined as Record<string, unknown> | undefined,
}));

vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: (options: Record<string, unknown>) => {
    fontLoaderOptions.bricolage = options;
    return { variable: "font-bricolage-var" };
  },
  Newsreader: (options: Record<string, unknown>) => {
    fontLoaderOptions.newsreader = options;
    return { variable: "font-newsreader-var" };
  },
}));

import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("exports Louisiana Languages product metadata", () => {
    expect(metadata.title).toBe("Consigne · Louisiana Languages");
    expect(metadata.description).toBe(
      "atelier d'écriture · français louisianais",
    );
  });

  it("maps next/font CSS variables to distinct slots (not --font-sans)", () => {
    expect(fontLoaderOptions.bricolage?.variable).toBe("--font-bricolage");
    expect(fontLoaderOptions.newsreader?.variable).toBe("--font-newsreader");
    expect(fontLoaderOptions.bricolage?.variable).not.toBe("--font-sans");
    expect(fontLoaderOptions.newsreader?.variable).not.toBe("--font-sans");
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
