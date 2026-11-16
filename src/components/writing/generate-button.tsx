"use client";

import { Button } from "@/components/ui/button";
import { homeCopy } from "@/copy/fr";

export function GenerateButton({
  busy,
  disabled,
  onClick,
  label,
}: {
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      size="lg"
      className="min-h-[54px] w-full sm:min-h-12 sm:w-auto"
      disabled={disabled}
      busy={busy}
      onClick={onClick}
    >
      {busy ? homeCopy.generateBusy : label}
    </Button>
  );
}
