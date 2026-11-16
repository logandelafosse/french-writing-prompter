"use client";

import type { PromptMeta } from "@/contracts/prompt-meta";
import { formatPromptMeta } from "@/lib/format-prompt-meta";
import { homeCopy } from "@/copy/fr";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function PromptSheet({
  promptText,
  meta,
  animateKey,
  swap,
  generateBusy,
  embedded = false,
}: {
  promptText: string;
  meta: PromptMeta | null;
  animateKey: string;
  swap?: { onSwap: () => void; disabled?: boolean } | undefined;
  generateBusy?: boolean | undefined;
  embedded?: boolean | undefined;
}) {
  const metaLine = meta ? formatPromptMeta(meta) : null;

  const body = (
    <>
      <SectionLabel tone="primary">{homeCopy.promptLabel}</SectionLabel>
      <p
        key={animateKey}
        lang="fr"
        className={cn(
          "text-prompt text-ink font-serif text-pretty whitespace-pre-wrap",
          "max-sm:text-prompt-sm motion-safe:animate-prompt-rise",
        )}
      >
        {promptText}
      </p>
      {metaLine || swap ? (
        <div className="border-line flex flex-col gap-2 border-b pb-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-1 sm:pb-3.5">
          {metaLine ? (
            <p className="text-muted text-sm" lang="fr">
              {metaLine}
            </p>
          ) : (
            <span className="hidden sm:block" />
          )}
          {swap ? (
            <Button
              variant="text"
              className="max-sm:self-start max-sm:p-0 max-sm:pb-1.5"
              disabled={swap.disabled === true || generateBusy === true}
              busy={generateBusy === true}
              onClick={swap.onSwap}
            >
              {generateBusy ? homeCopy.generateBusy : homeCopy.swapPrompt}
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
  if (embedded) return body;
  return (
    <Surface padding="home" className="flex flex-col gap-2.5">
      {body}
    </Surface>
  );
}
