import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { carnetCopy } from "@/copy/carnet";
import type { DialectNote } from "@/contracts/dialect-note";
import type { Weakness } from "@/contracts/weakness";
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

const genreLinks = [
  {
    id: "grammaire-genre",
    type: "grammaire" as const,
    label: "le genre des noms",
    url: "https://www.laits.utexas.edu/tex/gr/no3.html",
  },
  {
    id: "input-innerfrench",
    type: "input" as const,
    label: "InnerFrench",
    url: "https://www.youtube.com/@innerfrench",
  },
];

const genreWeakness: Weakness = {
  category: "genre",
  label: "Genre des noms",
  count: 2,
  lastSeenAt: "2026-11-14T16:00:00-06:00",
  trend: "actif",
  isFocus: false,
  pinned: false,
  resources: genreLinks,
};

const accentsQuiet: Weakness = {
  category: "accents",
  label: "Accents (é / è / ê)",
  count: 1,
  lastSeenAt: "2026-11-06T16:00:00-06:00",
  trend: "tranquille",
  isFocus: false,
  pinned: false,
  resources: [],
};

const autreWeakness: Weakness = {
  category: "autre",
  label: "Autre",
  count: 1,
  lastSeenAt: "2026-11-14T16:00:00-06:00",
  trend: "actif",
  isFocus: false,
  pinned: false,
  resources: genreLinks,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function mockCarnet(
  notes: DialectNote[] = [],
  weaknesses: Weakness[] = [],
): void {
  vi.mocked(globalThis.fetch).mockImplementation((input) => {
    if (fetchUrl(input).includes("/api/weaknesses")) {
      return Promise.resolve(jsonResponse({ weaknesses, focus: [] }));
    }
    return Promise.resolve(jsonResponse({ notes }));
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
    mockCarnet();
    render(<CarnetPage now={now} />);
    expect(await screen.findByText(carnetCopy.notesEmpty)).toBeVisible();
    expect(screen.getByText(carnetCopy.weakEmpty)).toBeVisible();
  });

  it("lists a session note with its rule, example and nouvelle", async () => {
    mockCarnet([sessionNote]);
    render(<CarnetPage now={now} />);
    expect(await screen.findByText(sessionNote.rule)).toBeVisible();
    expect(screen.getByText(sessionNote.example ?? "")).toBeVisible();
    expect(screen.getByText(/séance d'aujourd'hui/)).toBeVisible();
    expect(screen.getByText("nouvelle")).toBeVisible();
  });

  it("clears a load error on retry", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    const fail = new Response("fail", {
      status: 500,
      statusText: "Server Error",
    });
    mockCarnet();
    fetchMock.mockResolvedValueOnce(fail).mockResolvedValueOnce(fail);
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
    mockCarnet();
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
    mockCarnet([sessionNote]);
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
      if (fetchUrl(input).includes("/api/weaknesses")) {
        return Promise.resolve(jsonResponse({ weaknesses: [], focus: [] }));
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

  it("lists a Weakness with id, label, and today meta above the notes", async () => {
    mockCarnet([], [genreWeakness]);
    render(<CarnetPage now={now} />);
    await screen.findByRole("heading", { name: "Genre des noms" });
    expect(screen.getByRole("article")).toHaveAttribute("id", "weakness-genre");
    expect(screen.getByText("2 fois · vu aujourd'hui · actif")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: carnetCopy.weakTitle }),
    ).toBeVisible();
    const row = screen.getByRole("article");
    expect(
      within(row).getByRole("link", { name: /Grammaire · le genre des noms/ }),
    ).toHaveAttribute("target", "_blank");
    expect(
      within(row).getByRole("link", { name: /Input · InnerFrench/ }),
    ).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("mutes a tranquille Weakness title and meta", async () => {
    mockCarnet([], [accentsQuiet]);
    render(<CarnetPage now={now} />);
    const title = await screen.findByRole("heading", {
      name: "Accents (é / è / ê)",
    });
    expect(title).toHaveClass("text-ink-2");
    expect(screen.getByText(/vu le 6 novembre · tranquille/)).toHaveClass(
      "text-muted",
    );
    expect(
      screen.queryByRole("link", { name: /Grammaire ·/ }),
    ).not.toBeInTheDocument();
  });

  it("Pratiquer ça pins the row and clears a practice error on retry", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    let pinned = false;
    let failOnce = true;
    fetchMock.mockImplementation((input, init) => {
      const url = fetchUrl(input);
      if (url.includes("/practice")) {
        if (failOnce) {
          failOnce = false;
          return Promise.resolve(new Response("fail", { status: 500 }));
        }
        pinned = (init?.method ?? "POST") !== "DELETE";
        return Promise.resolve(jsonResponse({ pinned }));
      }
      if (url.includes("/api/weaknesses")) {
        return Promise.resolve(
          jsonResponse({
            weaknesses: [{ ...genreWeakness, pinned, isFocus: false }],
            focus: [],
          }),
        );
      }
      return Promise.resolve(jsonResponse({ notes: [] }));
    });
    render(<CarnetPage now={now} />);
    const practice = await screen.findByRole("button", {
      name: carnetCopy.weakPractice,
    });
    expect(practice).toHaveAttribute("aria-pressed", "false");
    await user.click(practice);
    expect(
      await screen.findByText("Une erreur s'est produite. Réessaie."),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: carnetCopy.weakPractice }),
    );
    await waitFor(() => {
      expect(
        screen.queryByText("Une erreur s'est produite. Réessaie."),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: carnetCopy.weakPractice }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(screen.getByRole("article")).getByText("prochaine consigne"),
    ).toBeVisible();
  });

  it("shows focus du jour on a Focus Weakness", async () => {
    mockCarnet([], [{ ...genreWeakness, isFocus: true }]);
    render(<CarnetPage now={now} />);
    await screen.findByRole("heading", { name: "Genre des noms" });
    expect(screen.getByText(carnetCopy.weakMetaFocus)).toBeVisible();
  });

  it("does not show Pratiquer ça on Autre", async () => {
    mockCarnet([], [genreWeakness, autreWeakness]);
    render(<CarnetPage now={now} />);
    expect(await screen.findByRole("heading", { name: "Autre" })).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: carnetCopy.weakPractice }),
    ).toHaveLength(1);
  });

  it("disables every Pratiquer ça button while a pin is saving", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    let releaseHeld = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      releaseHeld = () => {
        resolve();
      };
    });
    fetchMock.mockImplementation(async (input) => {
      const url = fetchUrl(input);
      if (url.includes("/practice")) {
        await held;
        return jsonResponse({ pinned: true });
      }
      if (url.includes("/api/weaknesses")) {
        return jsonResponse({
          weaknesses: [genreWeakness, accentsQuiet],
          focus: [],
        });
      }
      return jsonResponse({ notes: [] });
    });
    render(<CarnetPage now={now} />);
    const buttons = await screen.findAllByRole("button", {
      name: carnetCopy.weakPractice,
    });
    const first = buttons[0];
    const second = buttons[1];
    expect(buttons).toHaveLength(2);
    if (first === undefined || second === undefined) return;
    await user.click(first);
    await waitFor(() => {
      expect(first).toBeDisabled();
      expect(second).toBeDisabled();
    });
    releaseHeld();
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: carnetCopy.weakPractice })[0],
      ).toBeEnabled();
    });
  });
});
