"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CefrLevel } from "@/contracts/cefr";
import {
  EvaluatePostResponse,
  LevelPutResponse,
  PromptPostResponse,
} from "@/contracts/api";
import { TodayGetResponse, type TodayGetDto } from "@/contracts/today";
import { useHeaderShell } from "@/components/shell/header-shell";
import { resolveHomePhase } from "@/contracts/today";
import { fetchJson, messageFromFetchError } from "@/lib/http";
import { homeCopy } from "@/copy/fr";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
import { EvaluationCard } from "@/components/legacy/prompt/evaluation-card";
import type { Evaluation } from "@/contracts/evaluation";
import { HomeDateTitle, HomePhaseA } from "./home-phase-a";

type BootstrapState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: TodayGetDto; selectedLevel: CefrLevel | null };

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
  };
}

export function HomePage({ now = () => new Date() }: { now?: () => Date }) {
  const { syncFromToday, refreshQuota } = useHeaderShell();
  const [titleDate] = useState(() => now());
  const [bootstrap, setBootstrap] = useState<BootstrapState>({
    kind: "loading",
  });
  const [generateUi, setGenerateUi] = useState<"idle" | "generating">("idle");
  const loadAlive = useRef(true);

  const loadToday = useCallback(async () => {
    const result = await fetchJson("/api/today", TodayGetResponse);
    if (!result.ok) {
      setBootstrap({
        kind: "error",
        message: messageFromFetchError(result.error, homeCopy.loadError),
      });
      return;
    }
    setBootstrap((prev) => applyToday(result.value, prev, syncFromToday));
  }, [syncFromToday]);

  useEffect(() => {
    loadAlive.current = true;
    void (async () => {
      const result = await fetchJson("/api/today", TodayGetResponse);
      if (!loadAlive.current) return;
      if (!result.ok) {
        setBootstrap({
          kind: "error",
          message: messageFromFetchError(result.error, homeCopy.loadError),
        });
        return;
      }
      setBootstrap((prev) => applyToday(result.value, prev, syncFromToday));
    })();
    return () => {
      loadAlive.current = false;
    };
  }, [syncFromToday]);

  const runGenerate = async (level: CefrLevel) => {
    setGenerateUi("generating");
    const levelResult = await fetchJson("/api/level", LevelPutResponse, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
    if (!levelResult.ok) {
      setGenerateUi("idle");
      setBootstrap({
        kind: "error",
        message: messageFromFetchError(levelResult.error, homeCopy.loadError),
      });
      return;
    }
    const promptResult = await fetchJson("/api/prompt", PromptPostResponse, {
      method: "POST",
    });
    setGenerateUi("idle");
    if (!promptResult.ok) {
      setBootstrap({
        kind: "error",
        message: messageFromFetchError(promptResult.error, homeCopy.loadError),
      });
      return;
    }
    await refreshQuota();
    await loadToday();
  };

  return (
    <main className="max-w-home mx-auto flex w-full flex-col gap-5 px-5 py-5 pb-20 sm:gap-[22px] sm:px-6 sm:pt-5">
      {bootstrap.kind === "loading" ? (
        <p className="text-muted text-sm" aria-live="polite">
          Chargement…
        </p>
      ) : null}
      {bootstrap.kind === "error" ? (
        <p role="alert" className="text-mistake text-sm">
          {bootstrap.message}
        </p>
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
}: {
  bootstrap: Extract<BootstrapState, { kind: "ready" }>;
  titleDate: Date;
  generating: boolean;
  onSelectLevel: (level: CefrLevel) => void;
  onGenerate: (level: CefrLevel) => void;
}) {
  const phase = resolveHomePhase(bootstrap.data);
  const isPhaseA = phase.kind === "A0-first-run" || phase.kind === "A-ready";
  const phaseLevel =
    phase.kind === "A0-first-run"
      ? bootstrap.selectedLevel
      : bootstrap.data.level;

  return (
    <>
      <HomeDateTitle at={titleDate} />
      {isPhaseA ? (
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
      ) : (
        <WritingInterim
          sessionId={phase.sessionId}
          promptText={phase.promptText}
        />
      )}
    </>
  );
}

function WritingInterim({
  sessionId,
  promptText,
}: {
  sessionId: number;
  promptText: string;
}) {
  const [writing, setWriting] = useState("");
  const [submitUi, setSubmitUi] = useState<
    "idle" | "evaluating" | "review" | "error"
  >("idle");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-5">
      <Surface padding="home">
        <p className="text-prompt text-ink font-serif whitespace-pre-wrap">
          {promptText}
        </p>
      </Surface>
      {submitUi === "review" && evaluation ? (
        <EvaluationCard evaluation={evaluation} />
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
