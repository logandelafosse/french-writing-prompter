"use client";

import type { ReactNode, Ref } from "react";
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
  label,
  swap,
  swapButtonRef,
  belowMeta,
  generateBusy,
  embedded = false,
  mode = "write",
}: {
  promptText: string;
  meta: PromptMeta | null;
  animateKey: string;
  label?: string | undefined;
  swap?:
    | {
        onSwap: () => void;
        disabled?: boolean;
        label?: string;
      }
    | undefined;
  swapButtonRef?: Ref<HTMLButtonElement> | undefined;
  belowMeta?: ReactNode;
  generateBusy?: boolean | undefined;
  embedded?: boolean | undefined;
  mode?: "write" | "review" | undefined;
}) {
  const metaLine = meta ? formatPromptMeta(meta) : null;
  const swapDisabled = swap?.disabled === true;
  const swapLabel = swap?.label ?? homeCopy.swapPrompt;
  const onSwap = mode === "review" ? undefined : swap?.onSwap;
  const review = mode === "review";

  const body = (
    <>
      <SectionLabel tone="primary">
        {label ?? homeCopy.promptLabel}
      </SectionLabel>
      <p
        key={animateKey}
        lang="fr"
        className={cn(
          "font-serif text-pretty whitespace-pre-wrap",
          review
            ? "text-prompt-review text-ink-2"
            : "text-prompt text-ink max-sm:text-prompt-sm motion-safe:animate-prompt-rise",
        )}
      >
        {promptText}
      </p>
      {metaLine || onSwap ? (
        <div className="border-line flex flex-col gap-2 border-b pb-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-1 sm:pb-3.5">
          {metaLine ? (
            <p
              className={cn(
                "text-muted",
                review ? "text-[13px] max-sm:hidden" : "text-sm",
              )}
              lang="fr"
            >
              {metaLine}
            </p>
          ) : (
            <span className="hidden sm:block" />
          )}
          {onSwap ? (
            <Button
              ref={swapButtonRef}
              variant="text"
              className="max-sm:self-start max-sm:p-0 max-sm:pb-1.5"
              disabled={swapDisabled || generateBusy === true}
              busy={generateBusy === true && !swapDisabled}
              onClick={onSwap}
            >
              {generateBusy && !swapDisabled
                ? homeCopy.generateBusy
                : swapLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
      {belowMeta}
    </>
  );
  if (embedded) return body;
  return (
    <Surface padding="home" className="flex flex-col gap-2.5">
      {body}
    </Surface>
  );
}
