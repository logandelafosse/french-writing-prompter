"use client";

import type { Correction } from "@/contracts/correction";
import { reviewCopy } from "@/copy/review";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const cardClass =
  "rounded-base border-line bg-sheet flex flex-col gap-2 border p-[16px_18px] outline-none";

export function CorrectionCard({
  correction,
  onAcknowledge,
}: {
  correction: Correction;
  onAcknowledge: () => void;
}) {
  if (correction.kind === "standard") {
    const done = correction.status === "acknowledged";
    return (
      <article
        id={`correction-${correction.ordinal}`}
        tabIndex={-1}
        className={cardClass}
      >
        <div className="text-kind text-standard flex items-center gap-2.5">
          <span className="rounded-marker-card border-standard border bg-white px-[7px] py-0.5 tracking-normal">
            {correction.ordinal}
          </span>
          <span className="uppercase">{reviewCopy.kindStandard}</span>
        </div>
        <p
          lang="fr"
          className={cn("text-quote m-0 font-serif", done && "text-muted")}
        >
          {done ? (
            correction.quote
          ) : (
            <>
              {correction.quote}{" "}
              <span className="text-muted">{reviewCopy.arrow}</span>{" "}
              <strong className="text-standard font-medium">
                {correction.suggestion}
              </strong>
            </>
          )}
        </p>
        {done ? null : (
          <>
            <p className="m-0 text-[15px] leading-normal">
              {correction.explanation}
            </p>
            <Button
              variant="secondary"
              className="self-start"
              onClick={onAcknowledge}
            >
              {reviewCopy.actionAck}
            </Button>
          </>
        )}
      </article>
    );
  }
  if (correction.kind !== "mistake") {
    return (
      <div className="text-[15px] leading-normal">
        <p lang="fr" className="text-quote m-0 font-serif">
          {correction.quote} {reviewCopy.arrow} {correction.suggestion}
        </p>
        <p className="mt-2 mb-0">
          {correction.question ?? correction.explanation}
        </p>
      </div>
    );
  }
  const done = correction.status === "acknowledged";
  return (
    <article
      id={`correction-${correction.ordinal}`}
      tabIndex={-1}
      className={cardClass}
    >
      <div className="text-kind text-mistake flex flex-wrap items-center gap-2.5">
        <span className="rounded-marker-card bg-mistake px-2 py-0.5 tracking-normal text-white">
          {correction.ordinal}
        </span>
        <span className="uppercase">{reviewCopy.kindMistake}</span>
      </div>
      <p
        lang="fr"
        className={cn("text-quote m-0 font-serif", done && "text-muted")}
      >
        {done ? (
          correction.quote
        ) : (
          <>
            <s className="text-muted">
              <span className="sr-only">{reviewCopy.avant} </span>
              {correction.quote}
            </s>{" "}
            <span className="text-muted">{reviewCopy.arrow}</span>{" "}
            <strong className="font-medium">{correction.suggestion}</strong>
          </>
        )}
      </p>
      {done ? null : (
        <>
          <p className="m-0 text-[15px] leading-normal">
            {correction.explanation}
          </p>
          <Button
            variant="secondary"
            className="self-start"
            onClick={onAcknowledge}
          >
            {reviewCopy.actionAck}
          </Button>
        </>
      )}
    </article>
  );
}
