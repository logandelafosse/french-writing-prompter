"use client";

import { useRef, useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { Button } from "@/components/ui/button";
import { cefrSubLevelFromScore } from "@/contracts/cefr";
import {
  DIMENSION_IDS,
  type Dimension,
  type EvaluationV2,
} from "@/contracts/evaluation";
import { reviewCopy } from "@/copy/review";
import { cn } from "@/lib/utils";

export function ScoresDisclosure({
  evaluation,
}: {
  evaluation: Pick<EvaluationV2, "overallCefr" | "dimensions" | "nextLevelTip">;
}) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<Dimension | null>(null);
  const touchOnly = useRef(false);

  const openHint = (key: Dimension) => {
    if (!touchOnly.current) setHint(key);
  };
  const closeHint = () => {
    if (!touchOnly.current) setHint(null);
  };
  const toggleHint = (key: Dimension) => {
    setHint((current) => (current === key ? null : key));
  };

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className="border-line rounded-base border"
    >
      <Collapsible.Trigger className="flex min-h-12 w-full flex-wrap items-center justify-between gap-1 gap-x-4 px-[18px] text-left text-[15px] font-semibold">
        <span className="text-primary">
          {open ? reviewCopy.scoresOpen : reviewCopy.scoresClosed}
        </span>
        <span className="text-ink-2 text-sm font-medium">
          {reviewCopy.scoresOverall(evaluation.overallCefr)}
        </span>
      </Collapsible.Trigger>
      <Collapsible.Panel className="px-[18px] pb-4">
        <ul className="mt-1 flex flex-col gap-1">
          {DIMENSION_IDS.map((key) => {
            const chip = cefrSubLevelFromScore(
              evaluation.dimensions[key].score,
            );
            const label = reviewCopy.dimensionLabel[key];
            return (
              <li key={key} className="relative">
                <Button
                  variant="text"
                  aria-expanded={hint === key}
                  onPointerDown={(event) => {
                    touchOnly.current = event.pointerType !== "mouse";
                  }}
                  onClick={() => {
                    if (touchOnly.current) toggleHint(key);
                  }}
                  onMouseEnter={() => openHint(key)}
                  onMouseLeave={closeHint}
                  onFocus={() => openHint(key)}
                  onBlur={closeHint}
                  className={cn(
                    "rounded-base grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-3 border border-transparent px-3 py-2.5",
                    "hover:border-line-strong hover:bg-primary-tint",
                    "focus-visible:border-line-strong focus-visible:bg-primary-tint",
                  )}
                >
                  <span className="text-ink justify-self-start text-[15px] font-medium">
                    {label}{" "}
                  </span>
                  <span className="text-primary text-base font-semibold">
                    {chip}
                  </span>
                </Button>
                {hint === key ? (
                  <div
                    role="tooltip"
                    className={cn(
                      "border-line bg-sheet rounded-base shadow-pop absolute right-0 left-0 z-10 p-[14px_16px]",
                      key === DIMENSION_IDS[DIMENSION_IDS.length - 1]
                        ? "bottom-[calc(100%+6px)]"
                        : "top-[calc(100%+6px)]",
                    )}
                  >
                    <p className="text-primary m-0 text-xs font-bold tracking-[0.08em] uppercase">
                      {label}
                    </p>
                    <p className="text-ink-2 mt-1.5 mb-0 text-sm leading-snug">
                      {reviewCopy.dimensionDefinition[key]}
                    </p>
                    <p className="border-line mt-2.5 mb-0 border-t pt-2.5 text-sm leading-snug">
                      <strong className="text-muted mb-1 block text-[11px] font-bold tracking-[0.08em] uppercase">
                        {reviewCopy.pourMonter}
                      </strong>
                      {evaluation.dimensions[key].comment}
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="bg-primary-tint text-ink-2 rounded-base mt-4 mb-0 p-3 text-sm leading-snug">
          {evaluation.nextLevelTip}
        </p>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
