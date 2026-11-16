"use client";

import type { Correction } from "@/contracts/correction";
import { reviewCopy } from "@/copy/review";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { cn } from "@/lib/utils";

const cardClass =
  "rounded-base border-line bg-sheet flex flex-col gap-2 border p-[16px_18px] outline-none";

export function CorrectionCard({
  correction,
  onAcknowledge,
  onPushBack,
  onConfirm,
  onReject,
}: {
  correction: Correction;
  onAcknowledge: () => void;
  onPushBack?: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
}) {
  if (
    correction.status === "confirmed_dialect" ||
    correction.status === "overturned"
  ) {
    return (
      <article
        id={`correction-${correction.ordinal}`}
        tabIndex={-1}
        className="outline-none"
      >
        <p className="m-0 text-[15px]">
          {reviewCopy.savedNote}{" "}
          <TextLink href="/carnet" compact>
            {reviewCopy.savedNoteLink}
          </TextLink>
        </p>
      </article>
    );
  }
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
              {correction.dlf !== null ? (
                <>
                  {" "}
                  <abbr
                    title={reviewCopy.dlfTitle}
                    className="text-dlf text-muted no-underline"
                  >
                    {reviewCopy.dlf}
                  </abbr>
                </>
              ) : null}
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
  if (correction.kind === "dialect_check" && correction.status === "open") {
    return (
      <article
        id={`correction-${correction.ordinal}`}
        tabIndex={-1}
        className={cardClass}
      >
        <div className="text-kind text-dialect flex items-center gap-2.5">
          <span className="rounded-marker-dialect bg-dialect px-[7px] py-0.5 tracking-normal text-white">
            {correction.ordinal} ?
          </span>
          <span className="uppercase">{reviewCopy.kindDialect}</span>
        </div>
        <p lang="fr" className="text-quote m-0 font-serif">
          <span className="bg-dialect-tint px-[3px] py-px">
            {correction.contextQuote ?? correction.quote}
          </span>
        </p>
        <p className="m-0 text-[15px] leading-normal">
          {correction.question ?? correction.explanation}
        </p>
        <div className="flex flex-wrap gap-2 max-sm:flex-col sm:gap-x-4">
          <Button
            variant="dialect"
            className="px-4 text-sm font-semibold max-sm:min-h-[46px] max-sm:w-full max-sm:text-[15px]"
            onClick={onConfirm}
          >
            {reviewCopy.actionConfirm}
          </Button>
          <Button
            variant="secondary"
            className="max-sm:min-h-[46px] max-sm:w-full max-sm:text-[15px]"
            onClick={onReject}
          >
            {reviewCopy.actionReject}
          </Button>
        </div>
      </article>
    );
  }
  const done = correction.status === "acknowledged";
  const showActions = correction.kind === "mistake" && !done;
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
      {showActions ? (
        <>
          <p className="m-0 text-[15px] leading-normal">
            {correction.explanation}
          </p>
          <div className="flex flex-wrap items-center gap-1 gap-x-4">
            <Button
              variant="secondary"
              className="self-start"
              onClick={onAcknowledge}
            >
              {reviewCopy.actionAck}
            </Button>
            <Button variant="quiet" onClick={onPushBack}>
              {reviewCopy.actionPushback}
            </Button>
          </div>
        </>
      ) : correction.status === "confirmed_mistake" ? (
        <p className="m-0 text-[15px] leading-normal">
          {correction.explanation}
        </p>
      ) : null}
    </article>
  );
}
