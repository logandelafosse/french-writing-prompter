"use client";

import { Button } from "@/components/ui/button";
import { homeCopy } from "@/copy/fr";

export function ErrorAlert({
  lead,
  body,
  onRetry,
}: {
  lead: string;
  body?: string | undefined;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      lang="fr"
      className="border-mistake bg-sheet rounded-base flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 border px-[18px] py-3.5"
    >
      <p className="text-ink min-w-0 flex-1 basis-80 text-[15px]/[1.45]">
        <strong className="font-semibold">{lead}</strong>
        {body ? ` ${body}` : null}
      </p>
      <Button
        variant="primary"
        className="min-h-touch px-[18px] text-[15px] font-semibold"
        onClick={onRetry}
      >
        {homeCopy.errorRetry}
      </Button>
    </div>
  );
}
