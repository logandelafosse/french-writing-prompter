import { describe, expect, it } from "vitest";
import { reconcileDraft } from "./reconcile-draft";

const serverOlder = {
  text: "sur le serveur",
  savedAt: "2026-11-16T15:00:00.000Z",
};
const localNewer = {
  text: "sur l'appareil",
  savedAt: "2026-11-16T16:00:00.000Z",
};

describe("reconcileDraft", () => {
  it("prefers the newest copy and flags when the server must be updated", () => {
    expect(reconcileDraft(serverOlder, localNewer)).toEqual({
      text: "sur l'appareil",
      savedAt: "2026-11-16T16:00:00.000Z",
      updateServer: true,
    });

    expect(
      reconcileDraft(
        { text: "sur le serveur", savedAt: "2026-11-16T16:00:00.000Z" },
        { text: "sur l'appareil", savedAt: "2026-11-16T15:00:00.000Z" },
      ),
    ).toEqual({
      text: "sur le serveur",
      savedAt: "2026-11-16T16:00:00.000Z",
      updateServer: false,
    });

    expect(
      reconcileDraft(
        { text: "pareil", savedAt: "2026-11-16T16:00:00.000Z" },
        { text: "pareil", savedAt: "2026-11-16T16:00:00.000Z" },
      ),
    ).toEqual({
      text: "pareil",
      savedAt: "2026-11-16T16:00:00.000Z",
      updateServer: false,
    });
  });

  it("uses whichever copy exists", () => {
    expect(reconcileDraft(serverOlder, null)).toEqual({
      text: "sur le serveur",
      savedAt: "2026-11-16T15:00:00.000Z",
      updateServer: false,
    });

    expect(reconcileDraft(null, localNewer)).toEqual({
      text: "sur l'appareil",
      savedAt: "2026-11-16T16:00:00.000Z",
      updateServer: true,
    });

    expect(reconcileDraft(null, null)).toEqual({
      text: "",
      savedAt: null,
      updateServer: false,
    });
  });
});
