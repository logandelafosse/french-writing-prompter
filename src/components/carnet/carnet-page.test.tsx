import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { carnetCopy } from "@/copy/carnet";
import type { DialectNote } from "@/contracts/dialect-note";
import { CarnetPage } from "./carnet-page";

const now = () => new Date("2026-11-14T18:00:00-06:00");

const sessionNote: DialectNote = {
  id: 1,
  rule: "Avec « tomber », on prend l'auxiliaire « avoir » : il a tombé.",
  example: "Mon petit cousin a tombé dans la boue.",
  scope: "word",
  form: "a tombé",
  learnerForm: "a tombé",
  tutorSuggestion: "est tombé",
  sourceSessionId: 9,
  sourceCorrectionId: "c1",
  createdAt: "2026-11-14T16:00:00-06:00",
  updatedAt: "2026-11-14T16:00:00-06:00",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("CarnetPage", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("shows the empty-state line when there are no notes", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({ notes: [] }));
    render(<CarnetPage now={now} />);
    expect(await screen.findByText(carnetCopy.notesEmpty)).toBeVisible();
  });

  it("lists a session note with its rule, example and nouvelle", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse({ notes: [sessionNote] }),
    );
    render(<CarnetPage now={now} />);
    expect(await screen.findByText(sessionNote.rule)).toBeVisible();
    expect(screen.getByText(sessionNote.example ?? "")).toBeVisible();
    expect(screen.getByText(/séance d'aujourd'hui/)).toBeVisible();
    expect(screen.getByText("nouvelle")).toBeVisible();
  });

  it("clears a load error on retry", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response("fail", { status: 500, statusText: "Server Error" }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ notes: [] }));
    render(<CarnetPage now={now} />);
    expect(
      await screen.findByText("Une erreur s'est produite. Réessaie."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Essayer encore" }));
    await waitFor(() => {
      expect(
        screen.queryByText("Une erreur s'est produite. Réessaie."),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText(carnetCopy.notesEmpty)).toBeVisible();
  });

  it("Ajouter une note opens the sheet without T'as écrit", async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({ notes: [] }));
    render(<CarnetPage now={now} />);
    await screen.findByText(carnetCopy.notesEmpty);
    await user.click(screen.getByRole("button", { name: carnetCopy.notesAdd }));
    const dialog = await screen.findByRole("dialog", {
      name: "Ajouter une note de dialecte",
    });
    expect(within(dialog).queryByText("T'as écrit")).not.toBeInTheDocument();
  });

  it("Modifier opens Modifier la note pre-filled", async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse({ notes: [sessionNote] }),
    );
    render(<CarnetPage now={now} />);
    await screen.findByText(sessionNote.rule);
    await user.click(
      screen.getByRole("button", { name: carnetCopy.notesEdit }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Modifier la note",
    });
    expect(within(dialog).getByLabelText(/La règle/)).toHaveValue(
      sessionNote.rule,
    );
  });

  it("Supprimer focuses Garder, Escape keeps the note, and confirm removes it", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    let deleted = false;
    fetchMock.mockImplementation((input, init) => {
      if ((init?.method ?? "GET") === "DELETE") {
        deleted = true;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(
        jsonResponse({ notes: deleted ? [] : [sessionNote] }),
      );
    });
    render(<CarnetPage now={now} />);
    await screen.findByText(sessionNote.rule);
    await user.click(
      screen.getByRole("button", { name: carnetCopy.notesDelete }),
    );
    const dialog = screen.getByRole("alertdialog", {
      name: carnetCopy.deleteLabel,
    });
    expect(
      within(dialog).getByRole("button", { name: carnetCopy.deleteKeep }),
    ).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByText(sessionNote.rule)).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: carnetCopy.notesDelete }),
    );
    await user.click(
      screen.getByRole("button", { name: carnetCopy.notesDelete }),
    );
    await waitFor(() => {
      expect(screen.queryByText(sessionNote.rule)).not.toBeInTheDocument();
    });
  });
});
