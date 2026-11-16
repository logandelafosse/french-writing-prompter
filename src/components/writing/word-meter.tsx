"use client";
import type { ReactNode } from "react";
import { countWords } from "@/lib/count-words";
import {
  wordMeterFillRatio,
  wordMeterZoneStartRatio,
} from "@/lib/word-meter-math";
import { cn } from "@/lib/utils";
export function WordMeter({
  text,
  target,
  layout,
  compactActions,
}: {
  text: string;
  target: { min: number; max: number } | null;
  layout: "desktop" | "mobile";
  compactActions?: ReactNode | undefined;
}) {
  const count = countWords(text);
  const fillPct = target ? wordMeterFillRatio(count, target.max) * 100 : 0;
  const zoneLeftPct = target
    ? wordMeterZoneStartRatio(target.min, target.max) * 100
    : 0;
  const countLabel = (
    <span className="text-muted text-sm leading-snug">
      <strong className="text-ink font-semibold">{count}</strong>
      {target ? (
        <>
          {" "}
          / {target.min}–{target.max} mots
        </>
      ) : (
        <> mots</>
      )}
    </span>
  );
  const track = target ? (
    <div
      aria-hidden
      data-testid="word-meter-track"
      className={cn(
        "bg-rule rounded-radius-meter relative h-1.5",
        layout === "desktop" ? "w-60" : "w-full",
      )}
    >
      <div
        className="bg-meter-target rounded-radius-meter absolute top-[-3px] right-0 bottom-[-3px]"
        style={{ left: `${zoneLeftPct}%` }}
      />
      <div
        className="bg-primary rounded-radius-meter absolute top-0 bottom-0 left-0"
        style={{ width: `${fillPct}%` }}
      />
    </div>
  ) : null;
  if (layout === "mobile")
    return (
      <div className="flex w-full flex-col gap-2.5">
        {track}
        {compactActions ? (
          <div className="flex items-center justify-between gap-3">
            {countLabel}
            {compactActions}
          </div>
        ) : (
          countLabel
        )}
      </div>
    );
  return (
    <div className="flex min-w-60 flex-col gap-2">
      {track}
      {countLabel}
    </div>
  );
}
