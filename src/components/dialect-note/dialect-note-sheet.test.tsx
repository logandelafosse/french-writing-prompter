import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DialectNoteSheet } from "./dialect-note-sheet";
import type { DialectSheetDraft } from "./sheet-draft";

const draft: DialectSheetDraft = {
  lemma: "a tombé",
  example: "Mon petit cousin a tombé dans la boue.",
  pattern: null,
  rule: "On dit a tombé.",
};

describe("DialectNoteSheet", () => {
  it("opens a labelled dialog with quote fallbacks and hides the pattern radio", () => {
    render(
      <DialectNoteSheet
        open
        onOpenChange={() => undefined}
        written="a tombé"
        tutorProposed="est tombé"
        draft={draft}
        onSave={() => Promise.resolve(true)}
      />,
    );

    const dialog = screen.getByRole("dialog", {
      name: "Ajouter une note de dialecte",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("T'as écrit")).toBeVisible();
    expect(screen.getByText("a tombé")).toBeVisible();
    expect(screen.getByText("est tombé")).toBeVisible();
    expect(screen.getByLabelText(/La règle/)).toHaveValue("On dit a tombé.");
    expect(screen.getByLabelText("Un exemple")).toHaveValue(
      "Mon petit cousin a tombé dans la boue.",
    );
    expect(
      screen.getByRole("radio", { name: /Ce mot seulement : « a tombé »/ }),
    ).toBeChecked();
    expect(
      screen.queryByRole("radio", { name: /Toute la famille/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the pattern radio when a pattern is present", () => {
    render(
      <DialectNoteSheet
        open
        onOpenChange={() => undefined}
        written="a tombé"
        tutorProposed="est tombé"
        draft={{
          ...draft,
          pattern: "« avoir » avec les verbes de mouvement",
        }}
        onSave={() => Promise.resolve(true)}
      />,
    );
    expect(
      screen.getByRole("radio", {
        name: /Toute la famille : « avoir » avec les verbes de mouvement/,
      }),
    ).toBeVisible();
  });

  it("Fermer and Annuler dismiss the sheet", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <DialectNoteSheet
        open
        onOpenChange={onOpenChange}
        written="a tombé"
        tutorProposed="est tombé"
        draft={draft}
        onSave={() => Promise.resolve(true)}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });
});
