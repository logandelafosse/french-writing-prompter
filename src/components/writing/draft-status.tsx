"use client";

import { homeCopy } from "@/copy/fr";
import { formatFrenchTime } from "@/lib/dates";

export function DraftStatus({
  savedAt,
  localOnly = false,
}: {
  savedAt?: string | null | undefined;
  localOnly?: boolean | undefined;
}) {
  const text = localOnly
    ? homeCopy.draftLocal
    : savedAt
      ? homeCopy.draftSaved(formatFrenchTime(new Date(savedAt)))
      : null;
  if (text === null) return null;
  return (
    <span lang="fr" className="text-muted text-sm leading-snug">
      {text}
    </span>
  );
}
