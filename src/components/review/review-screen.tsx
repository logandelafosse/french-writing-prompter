"use client";

import { useEffect, useRef, useState } from "react";
import {
  CorrectionPatchResponse,
  DialectNoteCreateResponse,
} from "@/contracts/api";
import type { Correction } from "@/contracts/correction";
import type { EvaluationV2 } from "@/contracts/evaluation";
import type { PromptMeta } from "@/contracts/prompt-meta";
import { formatEvaluationSummary, reviewCopy } from "@/copy/review";
import { homeCopy } from "@/copy/fr";
import { countWords } from "@/lib/count-words";
import { fetchJson, messageFromFetchError } from "@/lib/http";
import { Surface } from "@/components/ui/surface";
import { PromptSheet } from "@/components/writing/prompt-sheet";
import { GenerateButton } from "@/components/writing/generate-button";
import {
  DialectNoteSheet,
  type DialectNoteSheetSave,
} from "@/components/dialect-note/dialect-note-sheet";
import { dialectSheetDraft } from "@/components/dialect-note/sheet-draft";
import { CorrectionCard } from "./correction-card";
import { MarkedText } from "./marked-text";
import { ScoresDisclosure } from "./scores-disclosure";

function isOpenCard(item: Correction) {
  return item.status === "open";
}

function nextOpenCard(items: Correction[], fromOrdinal: number) {
  return (
    items.find((item) => isOpenCard(item) && item.ordinal > fromOrdinal) ??
    items.find(isOpenCard)
  );
}

export function ReviewScreen({
  promptText,
  promptMeta,
  writingText,
  corrections,
  evaluation = null,
  quotaRemaining,
  generating,
  onNextPrompt,
}: {
  promptText: string;
  promptMeta: PromptMeta | null;
  writingText: string;
  corrections: Correction[];
  evaluation?: EvaluationV2 | null;
  quotaRemaining: number;
  generating: boolean;
  onNextPrompt: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mobileTitleRef = useRef<HTMLHeadingElement>(null);
  const [resolved, setResolved] = useState<Record<string, Correction>>({});
  const [sheetFor, setSheetFor] = useState<Correction | null>(null);
  const [ackUi, setAckUi] = useState<
    { status: "idle" } | { status: "saving" } | { status: "error" }
  >({ status: "idle" });
  const [desktop, setDesktop] = useState(true);
  const items = corrections.map((item) => resolved[item.id] ?? item);
  const sheetDraft =
    sheetFor === null ? null : dialectSheetDraft(sheetFor, writingText);

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

  const applyResolved = (updated: Correction) => {
    const nextResolved = { ...resolved, [updated.id]: updated };
    setResolved(nextResolved);
    const nextItems = corrections.map((item) => nextResolved[item.id] ?? item);
    const next = nextOpenCard(nextItems, updated.ordinal);
    document.getElementById(`correction-${(next ?? updated).ordinal}`)?.focus();
  };

  const patchCorrection = async (
    target: Correction,
    action: "acknowledge" | "reject_dialect",
  ) => {
    if (ackUi.status === "saving") return;
    setAckUi({ status: "saving" });
    const result = await fetchJson(
      `/api/corrections/${target.id}`,
      CorrectionPatchResponse,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );
    if (!result.ok) {
      setAckUi({ status: "error" });
      return;
    }
    setAckUi({ status: "idle" });
    applyResolved(
      action === "acknowledge"
        ? { ...target, status: "acknowledged" }
        : result.value.correction,
    );
  };

  const saveNote = async (
    note: DialectNoteSheetSave,
    signal: AbortSignal,
  ): Promise<string | null> => {
    if (sheetFor === null) return homeCopy.loadError;
    const result = await fetchJson(
      "/api/dialect-notes",
      DialectNoteCreateResponse,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          rule: note.rule,
          example: note.example,
          scope: note.scope,
          form: note.form,
          learnerForm: sheetFor.quote,
          tutorSuggestion: sheetFor.suggestion,
          fromCorrectionId: sheetFor.id,
        }),
      },
    );
    if (signal.aborted) return homeCopy.loadError;
    if (!result.ok || result.value.correction === undefined) {
      return result.ok
        ? homeCopy.loadError
        : messageFromFetchError(result.error, homeCopy.loadError);
    }
    setSheetFor(null);
    applyResolved(result.value.correction);
    return null;
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
          {ackUi.status === "error" ? (
            <p role="alert" lang="fr" className="text-mistake m-0 text-sm">
              {homeCopy.loadError}
            </p>
          ) : null}
          {items.map((item) => (
            <CorrectionCard
              key={item.id}
              correction={item}
              onAcknowledge={() => {
                void patchCorrection(item, "acknowledge");
              }}
              onPushBack={() => setSheetFor(item)}
              onConfirm={() => setSheetFor(item)}
              onReject={() => {
                void patchCorrection(item, "reject_dialect");
              }}
            />
          ))}
          {evaluation ? <ScoresDisclosure evaluation={evaluation} /> : null}
          {sheetFor !== null && sheetDraft !== null ? (
            <DialectNoteSheet
              key={sheetFor.id}
              open
              // prettier-ignore
              onOpenChange={(next) => { if (!next) setSheetFor(null); }}
              written={sheetFor.quote}
              tutorProposed={sheetFor.suggestion}
              draft={sheetDraft}
              onSave={saveNote}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2 gap-x-[22px] pt-2.5">
            <GenerateButton
              busy={generating}
              disabled={quotaRemaining === 0}
              onClick={onNextPrompt}
              label={
                quotaRemaining === 0
                  ? homeCopy.reviewNextPromptDisabled
                  : homeCopy.reviewNextPrompt(quotaRemaining)
              }
            />
          </div>
        </section>
      </div>
    </>
  );
}
