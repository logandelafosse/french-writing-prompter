export type DraftCopy = { text: string; savedAt: string };

export type ReconciledDraft = {
  text: string;
  savedAt: string | null;
  updateServer: boolean;
};

/** Newest savedAt wins. Equal timestamps keep the server copy. */
export function reconcileDraft(
  server: DraftCopy | null,
  local: DraftCopy | null,
): ReconciledDraft {
  const localWins =
    local !== null && (server === null || local.savedAt > server.savedAt);
  const chosen = localWins ? local : server;
  if (!chosen) return { text: "", savedAt: null, updateServer: false };
  return {
    text: chosen.text,
    savedAt: chosen.savedAt,
    updateServer: localWins,
  };
}
