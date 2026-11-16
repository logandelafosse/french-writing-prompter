"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CEFR_UI_LABELS, type CefrLevel } from "@/contracts/cefr";
import type { LevelChangeDto } from "@/contracts/api";
import type { PromptMeta } from "@/contracts/prompt-meta";
import {
  EvaluatePostResponse,
  LevelPutResponse,
  LevelUndoResponse,
  PromptPostResponse,
} from "@/contracts/api";
import type { EvaluationV2 } from "@/contracts/evaluation";
import {
  TodayGetResponse,
  resolveHomePhase,
  type TodayGetDto,
} from "@/contracts/today";
import { useHeaderShell } from "@/components/shell/header-shell";
import { PromptSheet } from "@/components/writing/prompt-sheet";
import { classifyFetchError, fetchJson, type FetchError } from "@/lib/http";
import type { ClassifiedFetchFailure } from "@/contracts/errors";
import type { Correction } from "@/contracts/correction";
import { homeCopy } from "@/copy/fr";
import { Surface } from "@/components/ui/surface";
import { ReviewScreen } from "@/components/review/review-screen";
import { RuledTextarea } from "@/components/writing/ruled-textarea";
import { WritingFooter } from "@/components/writing/writing-footer";
import { countWords } from "@/lib/count-words";
import { removeInactiveDrafts } from "@/lib/draft-storage";
import { useDraftAutosave } from "@/components/writing/use-draft-autosave";
import { shouldShowWordNudge } from "@/lib/word-meter-math";
import { cn } from "@/lib/utils";
import { ConfirmSwapDialog } from "@/components/states/confirm-swap-dialog";
import { ErrorAlert } from "@/components/states/error-alert";
import { QuotaNotice } from "@/components/states/notice";
import { OfflineNotice, useOffline } from "@/components/states/offline-notice";
import { HomeDateTitle, HomePhaseA } from "./home-phase-a";
import { FocusLine } from "./focus-line";
import { AdvancementBanner } from "@/components/states/advancement-banner";

type PromptAttempt =
  | { ok: true }
  | { ok: false; reason: "draft"; wordCount: number }
  | { ok: false; reason: "failed" };

type SwapBody = {
  replaceSessionId: number;
  confirmAbandon?: boolean;
};

// prettier-ignore
type BootstrapState =
  | { kind: "loading" }
  | { kind: "initial-error"; failure: ClassifiedFetchFailure }
  | { kind: "ready"; data: TodayGetDto; selectedLevel: CefrLevel | null; actionFailure: ClassifiedFetchFailure | null };

function failBootstrap(
  prev: BootstrapState,
  error: FetchError,
): BootstrapState {
  const failure = classifyFetchError(error);
  return prev.kind === "ready"
    ? { ...prev, actionFailure: failure }
    : { kind: "initial-error", failure };
}

function applyToday(
  value: TodayGetDto,
  prev: BootstrapState,
  syncFromToday: (payload: TodayGetDto) => void,
): BootstrapState {
  syncFromToday(value);
  return {
    kind: "ready",
    data: value,
    selectedLevel:
      prev.kind === "ready" && prev.selectedLevel !== null
        ? prev.selectedLevel
        : value.level,
    actionFailure: null,
  };
}

export function HomePage({ now = () => new Date() }: { now?: () => Date }) {
  const { syncFromToday, refreshQuota, refreshShell } = useHeaderShell();
  const [undoBusy, setUndoBusy] = useState(false);
  const [titleDate] = useState(() => now());
  const [bootstrap, setBootstrap] = useState<BootstrapState>({
    kind: "loading",
  });
  const [generateUi, setGenerateUi] = useState<"idle" | "generating">("idle");
  const [reviewing, setReviewing] = useState(false);
  const offline = useOffline();

  const loadToday = useCallback(async () => {
    const result = await fetchJson("/api/today", TodayGetResponse, {
      loadingTimeout: true,
    });
    if (!result.ok) {
      setBootstrap((prev) => failBootstrap(prev, result.error));
      return;
    }
    setBootstrap((prev) => applyToday(result.value, prev, syncFromToday));
  }, [syncFromToday]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial bootstrap load
    void loadToday();
  }, [loadToday]);

  useEffect(() => {
    if (bootstrap.kind !== "ready") return;
    removeInactiveDrafts(bootstrap.data.activeSession?.id ?? null);
  }, [bootstrap]);

  const postPrompt = async (
    body: {
      replaceSessionId?: number;
      confirmAbandon?: boolean;
    } = {},
  ): Promise<PromptAttempt> => {
    const promptResult = await fetchJson("/api/prompt", PromptPostResponse, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!promptResult.ok) {
      const error = promptResult.error;
      if (
        error.kind === "http" &&
        error.status === 409 &&
        error.message === "DRAFT_WOULD_BE_ABANDONED" &&
        error.wordCount !== undefined
      ) {
        return { ok: false, reason: "draft", wordCount: error.wordCount };
      }
      setBootstrap((prev) => failBootstrap(prev, error));
      return { ok: false, reason: "failed" };
    }
    await refreshQuota();
    await loadToday();
    return { ok: true };
  };

  const runGenerate = async (level: CefrLevel) => {
    setGenerateUi("generating");
    const levelResult = await fetchJson("/api/level", LevelPutResponse, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
    if (!levelResult.ok) {
      setGenerateUi("idle");
      setBootstrap((prev) => failBootstrap(prev, levelResult.error));
      return;
    }
    await postPrompt();
    setGenerateUi("idle");
  };

  const runFreshPrompt = async () => {
    setGenerateUi("generating");
    await postPrompt();
    setGenerateUi("idle");
  };

  const runSwap = async (body: SwapBody): Promise<PromptAttempt> => {
    setGenerateUi("generating");
    const result = await postPrompt(body);
    setGenerateUi("idle");
    return result;
  };

  const handleAfterEvaluate = useCallback(
    (advancement: LevelChangeDto | null | undefined) => {
      setBootstrap((prev) => {
        if (prev.kind !== "ready") return prev;
        const data = { ...prev.data };
        if (advancement !== undefined) data.advancement = advancement ?? null;
        if (advancement) {
          data.level = advancement.toLevel;
          data.levelName = CEFR_UI_LABELS[advancement.toLevel];
        }
        syncFromToday(data);
        return { ...prev, data };
      });
      if (advancement?.toLevel) {
        void refreshShell(advancement.toLevel);
      }
    },
    [refreshShell, syncFromToday],
  );

  const undoAdvancement = useCallback(async () => {
    const changeId =
      bootstrap.kind === "ready" ? bootstrap.data.advancement?.id : undefined;
    if (changeId === undefined) {
      return;
    }
    setUndoBusy(true);
    const result = await fetchJson("/api/level/undo", LevelUndoResponse, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeId }),
    });
    setUndoBusy(false);
    if (!result.ok) {
      setBootstrap((prev) => failBootstrap(prev, result.error));
      return;
    }
    await refreshShell(result.value.change.toLevel);
    await loadToday();
  }, [bootstrap, loadToday, refreshShell]);

  const generateFailure =
    bootstrap.kind === "ready" ? bootstrap.actionFailure : null;
  const loadFailure =
    bootstrap.kind === "initial-error" ? bootstrap.failure : null;
  const phase =
    bootstrap.kind === "ready" ? resolveHomePhase(bootstrap.data) : null;
  const writing = phase?.kind === "B-writing";
  const inReview = reviewing || phase?.kind === "C-review";
  const showOffline =
    (offline || loadFailure === "offline" || generateFailure === "offline") &&
    !writing;

  const retryHome = () => {
    if (bootstrap.kind === "initial-error") {
      void loadToday();
      return;
    }
    if (bootstrap.kind === "ready" && generateFailure) {
      const level = bootstrap.selectedLevel ?? bootstrap.data.level;
      if (level) void runGenerate(level);
      else void loadToday();
      return;
    }
    void loadToday();
  };

  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-col gap-5 px-5 py-5 pb-20 sm:gap-[22px] sm:px-6 sm:pt-5",
        inReview ? "max-w-review" : "max-w-home",
      )}
    >
      {bootstrap.kind === "loading" && !showOffline ? (
        <p className="text-muted text-sm" aria-live="polite">
          Chargement…
        </p>
      ) : null}
      {showOffline ? <OfflineNotice onRetry={retryHome} /> : null}
      {!showOffline && loadFailure !== null ? (
        <ErrorAlert
          lead={homeCopy.loadError}
          onRetry={() => void loadToday()}
        />
      ) : null}
      {!showOffline &&
      !writing &&
      generateFailure !== null &&
      generateFailure !== "offline" ? (
        <ErrorAlert lead={homeCopy.errorGenerateLead} onRetry={retryHome} />
      ) : null}
      {bootstrap.kind === "ready" ? (
        <HomeBody
          bootstrap={bootstrap}
          titleDate={titleDate}
          generating={generateUi === "generating"}
          offline={offline}
          undoBusy={undoBusy}
          onRetryGenerate={retryHome}
          onUndoAdvancement={() => void undoAdvancement()}
          onAfterEvaluate={handleAfterEvaluate}
          onSelectLevel={(level) =>
            setBootstrap((prev) =>
              prev.kind === "ready" ? { ...prev, selectedLevel: level } : prev,
            )
          }
          onGenerate={(level) => void runGenerate(level)}
          onSwap={(body) => runSwap(body)}
          onFreshPrompt={() => void runFreshPrompt()}
          reviewing={inReview}
          onReviewingChange={setReviewing}
          now={now}
        />
      ) : null}
    </main>
  );
}

function HomeBody({
  bootstrap,
  titleDate,
  generating,
  offline,
  undoBusy,
  onRetryGenerate,
  onUndoAdvancement,
  onAfterEvaluate,
  onSelectLevel,
  onGenerate,
  onSwap,
  onFreshPrompt,
  reviewing,
  onReviewingChange,
  now,
}: {
  bootstrap: Extract<BootstrapState, { kind: "ready" }>;
  titleDate: Date;
  generating: boolean;
  offline: boolean;
  undoBusy: boolean;
  onRetryGenerate: () => void;
  onUndoAdvancement: () => void;
  onAfterEvaluate: (advancement: LevelChangeDto | null | undefined) => void;
  onSelectLevel: (level: CefrLevel) => void;
  onGenerate: (level: CefrLevel) => void;
  onSwap: (body: SwapBody) => Promise<PromptAttempt>;
  onFreshPrompt: () => void;
  reviewing: boolean;
  onReviewingChange: (reviewing: boolean) => void;
  now: () => Date;
}) {
  const phase = resolveHomePhase(bootstrap.data);
  const phaseLevel =
    phase.kind === "A0-first-run"
      ? bootstrap.selectedLevel
      : bootstrap.data.level;
  const quotaExhausted = bootstrap.data.quota.remaining === 0;
  const focus = bootstrap.data.focus;
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 640px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const aReadyHero = phase.kind === "A-ready" && !desktop && focus.length > 0;
  const runGenerate = () => {
    if (phaseLevel) onGenerate(phaseLevel);
  };
  return (
    <>
      <div
        className={cn(
          reviewing && "max-sm:hidden",
          reviewing &&
            desktop &&
            "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2",
        )}
      >
        <HomeDateTitle at={titleDate} />
        {reviewing && desktop ? (
          <FocusLine focus={focus} variant="inline" />
        ) : null}
      </div>
      {bootstrap.data.advancement !== null ? (
        <AdvancementBanner
          advancement={bootstrap.data.advancement}
          onUndo={onUndoAdvancement}
          undoBusy={undoBusy}
        />
      ) : null}
      {quotaExhausted && phase.kind !== "A0-first-run" ? (
        <QuotaNotice
          resetsAt={bootstrap.data.quota.resetsAt}
          hasActiveSession={phase.kind === "B-writing"}
          now={now}
        />
      ) : null}
      {phase.kind === "C-review" ? (
        <ReviewScreen
          promptText={phase.promptText}
          promptMeta={phase.promptMeta}
          writingText={phase.writingText}
          corrections={phase.corrections}
          evaluation={phase.evaluation}
          quotaRemaining={bootstrap.data.quota.remaining}
          generating={generating}
          onNextPrompt={onFreshPrompt}
        />
      ) : phase.kind === "B-writing" ? (
        <>
          {!reviewing ? (
            <FocusLine focus={focus} variant={desktop ? "inline" : "stacked"} />
          ) : null}
          <WritingInterim
            key={`${phase.sessionId}-${phase.promptText}`}
            sessionId={phase.sessionId}
            promptText={phase.promptText}
            promptMeta={phase.promptMeta}
            draft={phase.draft}
            generating={generating}
            quotaRemaining={bootstrap.data.quota.remaining}
            offline={offline}
            generateFailure={bootstrap.actionFailure}
            onRetryGenerate={onRetryGenerate}
            onSwap={onSwap}
            onFreshPrompt={onFreshPrompt}
            onAfterEvaluate={onAfterEvaluate}
            onReviewingChange={onReviewingChange}
          />
        </>
      ) : aReadyHero ? (
        <FocusLine
          focus={focus}
          variant="hero"
          generate={{
            onGenerate: runGenerate,
            generating,
            disabled: quotaExhausted,
          }}
        />
      ) : (
        <>
          {phase.kind === "A-ready" ? (
            <FocusLine focus={focus} variant="inline" />
          ) : null}
          <HomePhaseA
            variant={phase.kind === "A0-first-run" ? "first-run" : "ready"}
            selectedLevel={phaseLevel}
            onLevelChange={
              phase.kind === "A0-first-run" ? onSelectLevel : () => undefined
            }
            onGenerate={runGenerate}
            generating={generating}
            quotaRemaining={bootstrap.data.quota.remaining}
          />
        </>
      )}
    </>
  );
}

function WritingInterim({
  sessionId,
  promptText,
  promptMeta,
  draft,
  generating,
  quotaRemaining,
  offline,
  generateFailure,
  onRetryGenerate,
  onSwap,
  onFreshPrompt,
  onAfterEvaluate,
  onReviewingChange,
}: {
  sessionId: number;
  promptText: string;
  promptMeta: PromptMeta | null;
  draft: { text: string; savedAt: string } | null;
  generating: boolean;
  quotaRemaining: number;
  offline: boolean;
  generateFailure: ClassifiedFetchFailure | null;
  onRetryGenerate: () => void;
  onSwap: (body: SwapBody) => Promise<PromptAttempt>;
  onFreshPrompt: () => void;
  onAfterEvaluate: (advancement: LevelChangeDto | null | undefined) => void;
  onReviewingChange: (reviewing: boolean) => void;
}) {
  const autosave = useDraftAutosave(sessionId, draft);
  const writing = autosave.text;
  const saveNow = autosave.saveNow;
  const [submitUi, setSubmitUi] = useState<
    "idle" | "evaluating" | "review" | "error"
  >("idle");
  const [review, setReview] = useState<{
    writingText: string;
    corrections: Correction[];
    evaluation: EvaluationV2;
  } | null>(null);
  const [submitFailure, setSubmitFailure] =
    useState<ClassifiedFetchFailure | null>(null);
  const [swapConfirm, setSwapConfirm] = useState<{ wordCount: number } | null>(
    null,
  );
  const promptRegionRef = useRef<HTMLDivElement | null>(null);
  const swapRef = useRef<HTMLButtonElement>(null);
  const swapOpen = useRef(false);
  const quotaExhausted = quotaRemaining === 0;
  const promptLabel = quotaExhausted
    ? homeCopy.promptLabelWithIndex
    : homeCopy.promptLabel;
  const swapLabel = quotaExhausted
    ? homeCopy.swapPromptDisabled
    : homeCopy.swapPrompt;

  const requestSwap = async () => {
    await saveNow();
    const words = countWords(writing);
    if (words >= 1) {
      setSwapConfirm({ wordCount: words });
      return;
    }
    const result = await onSwap({ replaceSessionId: sessionId });
    if (!result.ok && result.reason === "draft") {
      setSwapConfirm({ wordCount: result.wordCount });
    }
  };

  const confirmSwap = async () => {
    setSwapConfirm(null);
    await saveNow();
    const result = await onSwap({
      replaceSessionId: sessionId,
      confirmAbandon: true,
    });
    if (!result.ok && result.reason === "draft") {
      setSwapConfirm({ wordCount: result.wordCount });
    }
  };

  const submit = async () => {
    if (!writing.trim()) return;
    setSubmitUi("evaluating");
    setSubmitFailure(null);
    const result = await fetchJson("/api/evaluate", EvaluatePostResponse, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ writing: writing.trim(), sessionId }),
    });
    if (!result.ok) {
      const failure = classifyFetchError(result.error);
      setSubmitUi("error");
      setSubmitFailure(failure);
      return;
    }
    setSubmitUi("review");
    setReview({
      writingText: result.value.session.writingText ?? writing.trim(),
      corrections: result.value.corrections,
      evaluation: result.value.evaluation,
    });
    onReviewingChange(true);
    onAfterEvaluate(result.value.advancement);
  };

  useEffect(() => {
    const onOnline = () => {
      void saveNow();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [saveNow]);

  useEffect(() => {
    return () => onReviewingChange(false);
  }, [onReviewingChange]);

  useEffect(() => {
    swapOpen.current = swapConfirm !== null;
  }, [swapConfirm]);

  useEffect(() => {
    if (generating || swapOpen.current) return;
    promptRegionRef.current?.focus();
  }, [promptText, generating]);

  const wordTarget = promptMeta?.wordTarget ?? null;
  const evaluating = submitUi === "evaluating";
  const showNudge =
    submitUi === "idle" &&
    wordTarget !== null &&
    shouldShowWordNudge(countWords(writing), wordTarget);

  const runSubmitFromShortcut = () => {
    if (!evaluating && writing.trim().length > 0) {
      void submit();
    }
  };

  if (submitUi === "review" && review) {
    return (
      <>
        <ReviewScreen
          promptText={promptText}
          promptMeta={promptMeta}
          writingText={review.writingText}
          corrections={review.corrections}
          evaluation={review.evaluation}
          quotaRemaining={quotaRemaining}
          generating={generating}
          onNextPrompt={onFreshPrompt}
        />
        {generateFailure !== null &&
        !(generateFailure === "offline" && offline) ? (
          <ErrorAlert
            lead={homeCopy.errorGenerateLead}
            onRetry={onRetryGenerate}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={promptRegionRef} tabIndex={-1} className="outline-none">
        <Surface
          padding="home"
          className={cn(
            "flex flex-col gap-4 max-sm:gap-3.5 max-sm:p-[22px_18px]",
            "focus-within:border-primary focus-within:border-l-primary focus-within:border-l-2",
          )}
        >
          <PromptSheet
            embedded
            promptText={promptText}
            meta={promptMeta}
            label={promptLabel}
            animateKey={`${sessionId}-${promptText}`}
            generateBusy={generating}
            belowMeta={
              swapConfirm ? (
                <ConfirmSwapDialog
                  wordCount={swapConfirm.wordCount}
                  returnFocusRef={swapRef}
                  onKeep={() => setSwapConfirm(null)}
                  onConfirm={() => void confirmSwap()}
                />
              ) : null
            }
            swapButtonRef={swapRef}
            swap={{
              onSwap: () => void requestSwap(),
              disabled: quotaExhausted,
              label: swapLabel,
            }}
          />
          <RuledTextarea
            label={homeCopy.writingLabel}
            value={writing}
            onChange={autosave.onTextChange}
            readOnly={evaluating}
            onSubmitShortcut={runSubmitFromShortcut}
            minRows={8}
          />
          <div className="max-sm:hidden">
            <WritingFooter
              text={writing}
              target={wordTarget}
              layout="desktop"
              submitBusy={evaluating}
              savedAt={autosave.savedAt}
              localOnly={offline || submitFailure === "offline"}
              onSubmit={() => void submit()}
            />
          </div>
        </Surface>
        <div className="sm:hidden">
          <WritingFooter
            text={writing}
            target={wordTarget}
            layout="mobile"
            submitBusy={evaluating}
            savedAt={autosave.savedAt}
            localOnly={offline || submitFailure === "offline"}
            onSubmit={() => void submit()}
          />
        </div>
        {showNudge ? (
          <p className="text-muted px-2 text-sm max-sm:px-2 sm:px-0">
            {homeCopy.wordNudge}
          </p>
        ) : null}
        {offline || submitFailure === "offline" ? (
          <OfflineNotice
            onRetry={() => {
              void saveNow();
              if (submitFailure !== null) void submit();
            }}
          />
        ) : null}
        {generateFailure !== null &&
        !(generateFailure === "offline" && offline) ? (
          <ErrorAlert
            lead={homeCopy.errorGenerateLead}
            onRetry={onRetryGenerate}
          />
        ) : null}
        {submitFailure !== null && submitFailure !== "offline" ? (
          <ErrorAlert
            lead={homeCopy.errorEvaluateLead}
            body={homeCopy.errorEvaluateBody}
            onRetry={() => void submit()}
          />
        ) : null}
      </div>
    </div>
  );
}
