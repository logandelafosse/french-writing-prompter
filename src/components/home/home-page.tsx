"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CefrLevel } from "@/contracts/cefr";
import type { PromptMeta } from "@/contracts/prompt-meta";
import {
  EvaluatePostResponse,
  LevelPutResponse,
  PromptPostResponse,
} from "@/contracts/api";
import {
  TodayGetResponse,
  resolveHomePhase,
  type TodayGetDto,
} from "@/contracts/today";
import { useHeaderShell } from "@/components/shell/header-shell";
import { PromptSheet } from "@/components/writing/prompt-sheet";
import { fetchJson, messageFromFetchError } from "@/lib/http";
import { homeCopy } from "@/copy/fr";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { EvaluationCard } from "@/components/legacy/prompt/evaluation-card";
import { RuledTextarea } from "@/components/writing/ruled-textarea";
import { WritingFooter } from "@/components/writing/writing-footer";
import { GenerateButton } from "@/components/writing/generate-button";
import { countWords } from "@/lib/count-words";
import { removeInactiveDrafts } from "@/lib/draft-storage";
import { useDraftAutosave } from "@/components/writing/use-draft-autosave";
import { shouldShowWordNudge } from "@/lib/word-meter-math";
import { cn } from "@/lib/utils";
import type { Evaluation } from "@/contracts/evaluation";
import { ConfirmSwapDialog } from "@/components/states/confirm-swap-dialog";
import { QuotaNotice } from "@/components/states/notice";
import { HomeDateTitle, HomePhaseA } from "./home-phase-a";

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
  | { kind: "initial-error"; message: string }
  | { kind: "ready"; data: TodayGetDto; selectedLevel: CefrLevel | null; actionError: string | null };

function failBootstrap(prev: BootstrapState, message: string): BootstrapState {
  return prev.kind === "ready"
    ? { ...prev, actionError: message }
    : { kind: "initial-error", message };
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
    actionError: null,
  };
}

export function HomePage({ now = () => new Date() }: { now?: () => Date }) {
  const { syncFromToday, refreshQuota } = useHeaderShell();
  const [titleDate] = useState(() => now());
  const [bootstrap, setBootstrap] = useState<BootstrapState>({
    kind: "loading",
  });
  const [generateUi, setGenerateUi] = useState<"idle" | "generating">("idle");

  const loadToday = useCallback(async () => {
    const result = await fetchJson("/api/today", TodayGetResponse);
    if (!result.ok) {
      setBootstrap((prev) =>
        failBootstrap(
          prev,
          messageFromFetchError(result.error, homeCopy.loadError),
        ),
      );
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
      setBootstrap((prev) =>
        failBootstrap(prev, messageFromFetchError(error, homeCopy.loadError)),
      );
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
      setBootstrap((prev) =>
        failBootstrap(
          prev,
          messageFromFetchError(levelResult.error, homeCopy.loadError),
        ),
      );
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

  return (
    <main className="max-w-home mx-auto flex w-full flex-col gap-5 px-5 py-5 pb-20 sm:gap-[22px] sm:px-6 sm:pt-5">
      {bootstrap.kind === "loading" ? (
        <p className="text-muted text-sm" aria-live="polite">
          Chargement…
        </p>
      ) : null}
      {bootstrap.kind === "initial-error" ||
      (bootstrap.kind === "ready" && bootstrap.actionError) ? (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-mistake text-sm">
            {bootstrap.kind === "initial-error"
              ? bootstrap.message
              : bootstrap.actionError}
          </p>
          <Button
            variant="secondary-strong"
            size="lg"
            className="min-h-touch"
            onClick={() => {
              if (bootstrap.kind === "initial-error") void loadToday();
              else {
                const level = bootstrap.selectedLevel ?? bootstrap.data.level;
                if (level) void runGenerate(level);
                else void loadToday();
              }
            }}
          >
            {homeCopy.retry}
          </Button>
        </div>
      ) : null}
      {bootstrap.kind === "ready" ? (
        <HomeBody
          bootstrap={bootstrap}
          titleDate={titleDate}
          generating={generateUi === "generating"}
          onSelectLevel={(level) =>
            setBootstrap((prev) =>
              prev.kind === "ready" ? { ...prev, selectedLevel: level } : prev,
            )
          }
          onGenerate={(level) => void runGenerate(level)}
          onSwap={(body) => runSwap(body)}
          onFreshPrompt={() => void runFreshPrompt()}
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
  onSelectLevel,
  onGenerate,
  onSwap,
  onFreshPrompt,
  now,
}: {
  bootstrap: Extract<BootstrapState, { kind: "ready" }>;
  titleDate: Date;
  generating: boolean;
  onSelectLevel: (level: CefrLevel) => void;
  onGenerate: (level: CefrLevel) => void;
  onSwap: (body: SwapBody) => Promise<PromptAttempt>;
  onFreshPrompt: () => void;
  now: () => Date;
}) {
  const phase = resolveHomePhase(bootstrap.data);
  const phaseLevel =
    phase.kind === "A0-first-run"
      ? bootstrap.selectedLevel
      : bootstrap.data.level;
  const quotaExhausted = bootstrap.data.quota.remaining === 0;
  return (
    <>
      <HomeDateTitle at={titleDate} />
      {quotaExhausted && phase.kind !== "A0-first-run" ? (
        <QuotaNotice
          resetsAt={bootstrap.data.quota.resetsAt}
          hasActiveSession={phase.kind === "B-writing"}
          now={now}
        />
      ) : null}
      {phase.kind === "B-writing" ? (
        <WritingInterim
          key={`${phase.sessionId}-${phase.promptText}`}
          sessionId={phase.sessionId}
          promptText={phase.promptText}
          promptMeta={phase.promptMeta}
          draft={phase.draft}
          generating={generating}
          quotaRemaining={bootstrap.data.quota.remaining}
          onSwap={onSwap}
          onFreshPrompt={onFreshPrompt}
        />
      ) : (
        <HomePhaseA
          variant={phase.kind === "A0-first-run" ? "first-run" : "ready"}
          selectedLevel={phaseLevel}
          onLevelChange={
            phase.kind === "A0-first-run" ? onSelectLevel : () => undefined
          }
          onGenerate={() => {
            if (phaseLevel) onGenerate(phaseLevel);
          }}
          generating={generating}
          quotaRemaining={bootstrap.data.quota.remaining}
        />
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
  onSwap,
  onFreshPrompt,
}: {
  sessionId: number;
  promptText: string;
  promptMeta: PromptMeta | null;
  draft: { text: string; savedAt: string } | null;
  generating: boolean;
  quotaRemaining: number;
  onSwap: (body: SwapBody) => Promise<PromptAttempt>;
  onFreshPrompt: () => void;
}) {
  const autosave = useDraftAutosave(sessionId, draft);
  const writing = autosave.text;
  const [submitUi, setSubmitUi] = useState<
    "idle" | "evaluating" | "review" | "error"
  >("idle");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swapConfirm, setSwapConfirm] = useState<{ wordCount: number } | null>(
    null,
  );
  const resultsRef = useRef<HTMLElement | null>(null);
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
    await autosave.saveNow();
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
    await autosave.saveNow();
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
    setError(null);
    const result = await fetchJson("/api/evaluate", EvaluatePostResponse, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ writing: writing.trim(), sessionId }),
    });
    if (!result.ok) {
      setSubmitUi("error");
      setError(messageFromFetchError(result.error, homeCopy.evalError));
      return;
    }
    setSubmitUi("review");
    setEvaluation(result.value.evaluation);
  };

  useEffect(() => {
    if (submitUi === "review" && evaluation) resultsRef.current?.focus();
  }, [submitUi, evaluation]);

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

  if (submitUi === "review" && evaluation) {
    return (
      <div className="flex flex-col gap-5">
        <Surface
          padding="home"
          className="flex flex-col gap-4 max-sm:p-[22px_18px]"
        >
          <PromptSheet
            embedded
            promptText={promptText}
            meta={promptMeta}
            label={promptLabel}
            animateKey={`${sessionId}-${promptText}`}
            generateBusy={generating}
            swap={{
              onSwap: onFreshPrompt,
              disabled: quotaExhausted,
              label: swapLabel,
            }}
          />
          <RuledTextarea
            label={homeCopy.writingLabel}
            value={writing}
            onChange={autosave.onTextChange}
            readOnly
          />
        </Surface>
        <section
          ref={resultsRef}
          tabIndex={-1}
          aria-live="polite"
          lang="fr"
          className="outline-none"
        >
          <EvaluationCard evaluation={evaluation} />
        </section>
        <GenerateButton
          busy={generating}
          disabled={generating}
          onClick={onFreshPrompt}
          label={homeCopy.reviewNextPrompt(quotaRemaining)}
        />
      </div>
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
              submitRetry={submitUi === "error"}
              savedAt={autosave.savedAt}
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
            submitRetry={submitUi === "error"}
            savedAt={autosave.savedAt}
            onSubmit={() => void submit()}
          />
        </div>
        {showNudge ? (
          <p className="text-muted px-2 text-sm max-sm:px-2 sm:px-0">
            {homeCopy.wordNudge}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-mistake text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
