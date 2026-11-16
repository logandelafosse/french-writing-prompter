"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { homeCopy } from "@/copy/fr";

export function ConfirmSwapDialog({
  wordCount,
  onKeep,
  onConfirm,
  returnFocusRef,
}: {
  wordCount: number;
  onKeep: () => void;
  onConfirm: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);
  const onKeepRef = useRef(onKeep);
  const closing = useRef<"keep" | "confirm">("keep");

  useEffect(() => {
    onKeepRef.current = onKeep;
  }, [onKeep]);

  useEffect(() => {
    keepRef.current?.focus();
    const returnFocus = returnFocusRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closing.current = "keep";
      onKeepRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (closing.current === "keep") returnFocus?.focus();
    };
  }, [returnFocusRef]);

  return (
    <div
      role="alertdialog"
      aria-label={homeCopy.swapDialogLabel}
      className="border-line-strong bg-sheet shadow-pop rounded-base flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 border px-[18px] py-3.5"
    >
      <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
        <p className="text-ink text-[15px] font-semibold">
          {homeCopy.swapDialogLead}
        </p>
        <p className="text-ink-2 text-[15px]/[1.45]">
          {homeCopy.swapDialogBody(wordCount)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          ref={keepRef}
          variant="secondary-strong"
          onClick={() => {
            closing.current = "keep";
            onKeep();
          }}
        >
          {homeCopy.swapKeep}
        </Button>
        <Button
          variant="primary"
          className="min-h-11 px-4 text-[15px]"
          onClick={() => {
            closing.current = "confirm";
            onConfirm();
          }}
        >
          {homeCopy.swapConfirm}
        </Button>
      </div>
    </div>
  );
}
