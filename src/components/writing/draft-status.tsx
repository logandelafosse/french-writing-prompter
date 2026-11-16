"use client";

import { homeCopy } from "@/copy/fr";
import { formatFrenchTime } from "@/lib/dates";

export function DraftStatus({ savedAt }: { savedAt: string }) {
  return (
    <span lang="fr" className="text-muted text-sm leading-snug">
      {homeCopy.draftSaved(formatFrenchTime(new Date(savedAt)))}
    </span>
  );
}
