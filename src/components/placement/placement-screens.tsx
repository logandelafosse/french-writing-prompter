"use client";

import { useEffect, useRef } from "react";
import { ErrorAlert } from "@/components/states/error-alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { PageTitle } from "@/components/ui/page-title";
import { SectionLabel } from "@/components/ui/section-label";
import { Surface } from "@/components/ui/surface";
import { TextLink } from "@/components/ui/text-link";
import { PromptSheet } from "@/components/writing/prompt-sheet";
import { RuledTextarea } from "@/components/writing/ruled-textarea";
import { useDraftAutosave } from "@/components/writing/use-draft-autosave";
import { WritingFooter } from "@/components/writing/writing-footer";
import { useHeaderShell } from "@/components/shell/header-shell";
import type { ClassifiedFetchFailure } from "@/contracts/errors";
import type { PlacementResultView } from "@/contracts/placement";
import { homeCopy } from "@/copy/fr";
import { placementCopy } from "@/copy/placement";
import { cn } from "@/lib/utils";

const STEPS = [1, 2, 3] as const;

// prettier-ignore
export function PlacementProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div role="progressbar" aria-label={placementCopy.progressLabel} aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-valuetext={placementCopy.progressValue(step)} className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((n) => (
        <span key={n} aria-hidden data-testid="placement-progress-segment" className={cn("rounded-progress h-1", n <= step ? "bg-primary" : "bg-line-strong")} />
      ))}
    </div>
  );
}

// prettier-ignore
export function PlacementStart({ generating, onStart }: { generating: boolean; onStart: () => void }) {
  return (
    <>
      <PageTitle>{placementCopy.title}</PageTitle>
      <Surface padding="intro" className="flex flex-col gap-[26px] max-sm:p-[22px_18px]">
        <p lang="fr" className="text-ink font-serif text-[24px]/[1.4] text-pretty">{placementCopy.intro}</p>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-3 p-0">
          {STEPS.map((n) => (
            <li key={n} className={cn("flex flex-col gap-1 border-t-[3px] pt-3", n === 1 ? "border-primary" : "border-line-strong")}>
              <span className="text-muted text-[13px]">{placementCopy.stepN(n)}</span>
              <span className="text-[17px] font-semibold">{n === 1 ? placementCopy.stepNames[0] : n === 2 ? placementCopy.stepNames[1] : placementCopy.stepNames[2]}</span>
            </li>
          ))}
        </ol>
        <p lang="fr" className="text-muted m-0 text-[15px]/[1.5]">{placementCopy.caption}</p>
        <Button size="lg" busy={generating} onClick={onStart}>{placementCopy.start}</Button>
      </Surface>
    </>
  );
}

// prettier-ignore
export function PlacementStep({
  step, sessionId, prompt, draft, submitting, error, onText, onSubmit,
}: {
  step: 1 | 2 | 3; sessionId: number; prompt: string;
  draft: { text: string; savedAt: string } | null; submitting: boolean;
  error: ClassifiedFetchFailure | null; onText: (text: string) => void; onSubmit: (text: string) => void;
}) {
  const autosave = useDraftAutosave(sessionId, draft);
  const runSubmit = () => {
    if (submitting || autosave.text.trim().length === 0) return;
    void autosave.saveNow().then(() => onSubmit(autosave.text));
  };
  return (
    <>
      <div className="flex flex-col gap-3">
        <PageTitle size="step">{placementCopy.stepTitle(step)}</PageTitle>
        <PlacementProgress step={step} />
      </div>
      <Surface padding="home" className="flex flex-col gap-[18px] max-sm:p-[22px_18px]">
        <PromptSheet embedded mode="placement" promptText={prompt} meta={null} animateKey={`${sessionId}-${prompt}`} />
        <RuledTextarea label={homeCopy.writingLabel} value={autosave.text} readOnly={submitting} onSubmitShortcut={runSubmit} onChange={(value) => { autosave.onTextChange(value); onText(value); }} />
        <WritingFooter text={autosave.text} target={null} layout="desktop" submitBusy={submitting} savedAt={autosave.savedAt} onSubmit={runSubmit} submitLabel={step === 3 ? placementCopy.seeLevel : placementCopy.next} />
      </Surface>
      {error !== null ? <ErrorAlert lead={homeCopy.errorEvaluateLead} body={homeCopy.errorEvaluateBody} onRetry={runSubmit} /> : null}
    </>
  );
}

// prettier-ignore
export function PlacementResult({ result }: { result: PlacementResultView }) {
  const { openLevelMenu } = useHeaderShell();
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const last = result.steps.length - 1;
  return (
    <>
      <PageTitle ref={titleRef} size="step" tabIndex={-1} className="outline-none">{placementCopy.doneTitle}</PageTitle>
      <Surface padding="intro" aria-live="polite" className="flex flex-col gap-[26px] max-sm:p-[22px_18px]">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
          <span className="text-primary text-[96px] leading-[0.9] font-bold tracking-[-0.04em]">{result.finalLevel}</span>
          <div className="flex min-w-[300px] flex-1 flex-col gap-1.5 max-sm:min-w-0">
            <SectionLabel>{placementCopy.doneLabel(result.levelName)}</SectionLabel>
            <p lang="fr" className="text-ink font-serif text-[22px]/[1.4]">{result.summary}</p>
          </div>
        </div>
        <dl className="m-0 flex flex-col">
          {result.steps.map((row, index) => (
            <div key={row.step} className={cn("border-line flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-3", index === last ? "border-y" : "border-t")}>
              <dt className="text-muted w-[110px] shrink-0 text-sm">{placementCopy.stepN(row.step)}</dt>
              <dd className="m-0 w-12 shrink-0 text-[17px] font-semibold">{row.evaluatedLevel}</dd>
              <dd lang="fr" className="m-0 min-w-[260px] flex-1 text-[15px] max-sm:min-w-0">{row.summary}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <ButtonLink href="/" size="lg">{placementCopy.doneCta}</ButtonLink>
          <TextLink href="/" onClick={() => openLevelMenu()}>{placementCopy.doneOther}</TextLink>
        </div>
      </Surface>
    </>
  );
}
