"use client";
import { KbdHint } from "@/components/ui/kbd-hint";
import { WordMeter } from "./word-meter";
import { SubmitButton, isSubmitDisabled } from "./submit-button";
import { cn } from "@/lib/utils";
export function WritingFooter({
  text,
  target,
  layout,
  submitBusy,
  submitRetry,
  onSubmit,
}: {
  text: string;
  target: { min: number; max: number } | null;
  layout: "desktop" | "mobile";
  submitBusy: boolean;
  submitRetry?: boolean | undefined;
  onSubmit: () => void;
}) {
  const disabled = isSubmitDisabled(text, submitBusy);
  if (layout === "mobile")
    return (
      <div className="px-2">
        <WordMeter
          text={text}
          target={target}
          layout="mobile"
          compactActions={
            <SubmitButton
              busy={submitBusy}
              disabled={disabled}
              retry={submitRetry}
              onClick={onSubmit}
            />
          }
        />
      </div>
    );
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 pt-1.5",
      )}
    >
      <WordMeter text={text} target={target} layout="desktop" />
      <div className="flex items-center gap-3.5">
        <KbdHint />
        <SubmitButton
          busy={submitBusy}
          disabled={disabled}
          retry={submitRetry}
          onClick={onSubmit}
        />
      </div>
    </div>
  );
}
