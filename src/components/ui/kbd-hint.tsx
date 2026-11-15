"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function subscribePlatform() {
  return () => {};
}

function getAppleSnapshot() {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getAppleServerSnapshot() {
  return false;
}

export type KbdHintProps = {
  className?: string | undefined;
};

export function KbdHint({ className }: KbdHintProps) {
  const isApple = useSyncExternalStore(
    subscribePlatform,
    getAppleSnapshot,
    getAppleServerSnapshot,
  );

  return (
    <span
      aria-hidden
      className={cn("text-muted hidden text-[13px] sm:inline", className)}
    >
      {isApple ? "⌘ ↵" : "Ctrl ↵"}
    </span>
  );
}
