"use client";
import { Button } from "@/components/ui/button";
import { homeCopy } from "@/copy/fr";
export function SubmitButton({
  busy,
  disabled,
  onClick,
}: {
  busy: boolean;
  disabled?: boolean | undefined;
  onClick: () => void;
}) {
  return (
    <Button
      size="lg"
      className="min-h-[50px] px-6 sm:min-h-12"
      busy={busy}
      disabled={disabled}
      aria-keyshortcuts="Meta+Enter Control+Enter"
      onClick={onClick}
    >
      {busy ? homeCopy.submitBusy : homeCopy.submit}
    </Button>
  );
}
export function isSubmitDisabled(text: string, busy: boolean): boolean {
  return text.trim().length === 0 || busy;
}
