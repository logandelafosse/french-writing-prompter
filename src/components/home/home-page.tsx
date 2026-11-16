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
import { Field } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
import { EvaluationCard } from "@/components/legacy/prompt/evaluation-card";
import type { Evaluation } from "@/contracts/evaluation";
import { HomeDateTitle, HomePhaseA } from "./home-phase-a";

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

  const postPrompt = async (): Promise<boolean> => {
    const promptResult = await fetchJson("/api/prompt", PromptPostResponse, {
      method: "POST",
    });
    if (!promptResult.ok) {
      setBootstrap((prev) =>
        failBootstrap(
          prev,
          messageFromFetchError(promptResult.error, homeCopy.loadError),
        ),
      );
      return false;
    }
    await refreshQuota();
    await loadToday();
    return true;
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

  const runSwap = async () => {
    setGenerateUi("generating");
    await postPrompt();
    setGenerateUi("idle");
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
          onSwap={() => void runSwap()}
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
}: {
  bootstrap: Extract<BootstrapState, { kind: "ready" }>;
  titleDate: Date;
  generating: boolean;
  onSelectLevel: (level: CefrLevel) => void;
  onGenerate: (level: CefrLevel) => void;
  onSwap: () => void;
}) {
  const phase = resolveHomePhase(bootstrap.data);
  const phaseLevel =
    phase.kind === "A0-first-run"
      ? bootstrap.selectedLevel
      : bootstrap.data.level;
  return (
    <>
      <HomeDateTitle at={titleDate} />
      {phase.kind === "B-writing" ? (
        <WritingInterim
          sessionId={phase.sessionId}
          promptText={phase.promptText}
          promptMeta={phase.promptMeta}
          generating={generating}
          onSwap={onSwap}
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
  generating,
  onSwap,
}: {
  sessionId: number;
  promptText: string;
  promptMeta: PromptMeta | null;
  generating: boolean;
  onSwap: () => void;
}) {
  const [writing, setWriting] = useState("");
  const [submitUi, setSubmitUi] = useState<
    "idle" | "evaluating" | "review" | "error"
  >("idle");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const promptRegionRef = useRef<HTMLDivElement | null>(null);

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
    if (!generating && promptRegionRef.current) {
      promptRegionRef.current.focus();
    }
  }, [promptText, generating]);

  return (
    <div className="flex flex-col gap-5">
      <div
        ref={promptRegionRef}
        tabIndex={-1}
        aria-live="polite"
        className="outline-none"
      >
        <PromptSheet
          promptText={promptText}
          meta={promptMeta}
          animateKey={`${sessionId}-${promptText}`}
          generateBusy={generating}
          swap={{ onSwap }}
        />
      </div>
      {submitUi === "review" && evaluation ? (
        <section
          ref={resultsRef}
          tabIndex={-1}
          aria-live="polite"
          lang="fr"
          className="outline-none"
        >
          <EvaluationCard evaluation={evaluation} />
        </section>
      ) : (
        <Surface padding="home" className="flex flex-col gap-4">
          <Field label={homeCopy.writingLabel}>
            <Textarea
              lang="fr"
              value={writing}
              rows={8}
              onChange={(e) => setWriting(e.target.value)}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-mistake text-sm">
              {error}
            </p>
          ) : null}
          <Button
            size="lg"
            busy={submitUi === "evaluating"}
            disabled={!writing.trim() || submitUi === "evaluating"}
            onClick={() => void submit()}
          >
            {submitUi === "evaluating"
              ? homeCopy.submitBusy
              : error
                ? homeCopy.retry
                : homeCopy.submit}
          </Button>
        </Surface>
      )}
    </div>
  );
}
