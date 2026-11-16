"use client";

import { useEffect, useRef, useState } from "react";
import type { Correction } from "@/contracts/correction";
import type { PromptMeta } from "@/contracts/prompt-meta";
import { formatEvaluationSummary, reviewCopy } from "@/copy/review";
import { homeCopy } from "@/copy/fr";
import { countWords } from "@/lib/count-words";
import { Surface } from "@/components/ui/surface";
import { PromptSheet } from "@/components/writing/prompt-sheet";
import { GenerateButton } from "@/components/writing/generate-button";
import { CorrectionCard } from "./correction-card";
import { MarkedText } from "./marked-text";

function nextOpenMistake(items: Correction[], fromOrdinal: number) {
  return (
    items.find(
      (item) =>
        item.kind === "mistake" &&
        item.status === "open" &&
        item.ordinal > fromOrdinal,
    ) ?? items.find((item) => item.kind === "mistake" && item.status === "open")
  );
}

export function ReviewScreen({
  promptText,
  promptMeta,
  writingText,
  corrections,
  quotaRemaining,
  generating,
  onNextPrompt,
}: {
  promptText: string;
  promptMeta: PromptMeta | null;
  writingText: string;
  corrections: Correction[];
  quotaRemaining: number;
  generating: boolean;
  onNextPrompt: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mobileTitleRef = useRef<HTMLHeadingElement>(null);
  const [ackedIds, setAckedIds] = useState<string[]>([]);
  const [desktop, setDesktop] = useState(true);
  const items = corrections.map((item) =>
    ackedIds.includes(item.id)
      ? { ...item, status: "acknowledged" as const }
      : item,
  );

  useEffect(() => {
    (desktop ? headingRef : mobileTitleRef).current?.focus();
  }, [desktop, writingText]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 640px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const acknowledge = (target: Correction) => {
    const nextIds = ackedIds.includes(target.id)
      ? ackedIds
      : [...ackedIds, target.id];
    setAckedIds(nextIds);
    const nextItems = corrections.map((item) =>
      nextIds.includes(item.id)
        ? { ...item, status: "acknowledged" as const }
        : item,
    );
    const next = nextOpenMistake(nextItems, target.ordinal);
    if (next) {
      document.getElementById(`correction-${next.ordinal}`)?.focus();
    }
  };

  return (
    <>
      <h1
        ref={mobileTitleRef}
        tabIndex={-1}
        aria-hidden={desktop ? true : undefined}
        className="text-wordmark-sm font-semibold tracking-[-0.02em] outline-none sm:hidden"
      >
        {reviewCopy.title}
      </h1>
      <div className="flex flex-wrap items-start gap-7">
        <section
          aria-label={reviewCopy.sheetLabel}
          className="min-w-0 flex-[1_1_520px]"
        >
          <Surface
            padding="review"
            className="flex flex-col gap-4 max-sm:p-[22px_18px_26px]"
          >
            <PromptSheet
              embedded
              mode="review"
              promptText={promptText}
              meta={promptMeta}
              animateKey={`${writingText}-review`}
            />
            <p className="text-label text-muted m-0 uppercase">
              {reviewCopy.textLabel(countWords(writingText))}
            </p>
            <MarkedText text={writingText} corrections={items} />
          </Surface>
        </section>
        <section
          aria-label={
            desktop ? reviewCopy.regionLabel : reviewCopy.regionLabelMobile
          }
          className="flex min-w-0 flex-[1_1_420px] flex-col gap-3"
        >
          <div className="flex min-h-8 flex-wrap items-baseline justify-between gap-1 gap-x-4">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-section-title m-0 outline-none max-sm:hidden"
            >
              {reviewCopy.title}
            </h2>
            <p aria-live="polite" className="text-muted m-0 text-sm">
              {formatEvaluationSummary(items)}
            </p>
          </div>
          <h2 className="text-label text-muted m-0 uppercase sm:hidden">
            {reviewCopy.mobileListLabel}
          </h2>
          {items.map((item) => (
            <CorrectionCard
              key={item.id}
              correction={item}
              onAcknowledge={() => acknowledge(item)}
            />
          ))}
          <div className="flex flex-wrap items-center gap-2 gap-x-[22px] pt-2.5">
            <GenerateButton
              busy={generating}
              disabled={generating}
              onClick={onNextPrompt}
              label={homeCopy.reviewNextPrompt(quotaRemaining)}
            />
          </div>
        </section>
      </div>
    </>
  );
}
