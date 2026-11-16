"use client";

import type { LevelChangeDto } from "@/contracts/api";
import { homeCopy } from "@/copy/fr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdvancementBanner({
  advancement,
  onUndo,
  undoBusy = false,
}: {
  advancement: LevelChangeDto;
  onUndo: () => void;
  undoBusy?: boolean;
}) {
  const from = advancement.fromLevel;
  if (from === null) {
    return null;
  }

  return (
    <div
      role="status"
      lang="fr"
      className={cn(
        "border-primary bg-primary-tint rounded-base flex flex-col gap-2 border px-[22px] py-[18px]",
      )}
    >
      <p className="text-ink text-[18px] font-semibold">
        {homeCopy.advanceLead(advancement.toLevel)}
      </p>
      <p className="text-ink-2 text-[15px]/[1.5]">
        {homeCopy.advanceBody(from)}
      </p>
      <Button
        type="button"
        variant="quiet-ink"
        className="text-ink min-h-touch decoration-ink/40 hover:decoration-ink h-auto w-fit self-start px-1 text-[14px] font-normal underline underline-offset-4 hover:bg-transparent"
        busy={undoBusy}
        onClick={onUndo}
      >
        {homeCopy.advanceUndo(from)}
      </Button>
    </div>
  );
}
