"use client";

import type { CefrLevel } from "@/contracts/cefr";
import { CEFR_LEVELS, CEFR_UI_LABELS } from "@/contracts/cefr";
import { Button } from "@/components/ui/button";
import { GenerateButton } from "@/components/writing/generate-button";
import { PageTitle } from "@/components/ui/page-title";
import { SectionLabel } from "@/components/ui/section-label";
import { Surface } from "@/components/ui/surface";
import { TextLink } from "@/components/ui/text-link";
import { homeCopy } from "@/copy/fr";
import { appTimeZone, formatFrenchDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function HomeDateTitle({ at }: { at: Date }) {
  const lower = formatFrenchDate(at, appTimeZone());
  const title = lower
    ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`
    : lower;
  return <PageTitle>{title}</PageTitle>;
}

export function LevelPicker({
  value,
  onChange,
}: {
  value: CefrLevel | null;
  onChange: (level: CefrLevel) => void;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <SectionLabel as="legend" className="mb-1">
        {homeCopy.levelLegend}
      </SectionLabel>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(96px,100%),1fr))] gap-2">
        {CEFR_LEVELS.map((level) => {
          const pressed = value === level;
          return (
            <Button
              key={level}
              variant="secondary"
              aria-pressed={pressed}
              onClick={() => onChange(level)}
              className={cn(
                "flex h-auto min-h-16 flex-col items-center justify-center gap-0.5 px-2 py-2",
                pressed &&
                  "border-primary bg-primary-tint text-ink border-2 font-normal",
              )}
            >
              <strong className={cn("text-[18px]", pressed && "font-bold")}>
                {level}
              </strong>
              <span className="text-muted text-[12px] font-normal">
                {CEFR_UI_LABELS[level]}
              </span>
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function HomePhaseA({
  variant,
  selectedLevel,
  onLevelChange,
  onGenerate,
  generating,
  quotaRemaining,
}: {
  variant: "first-run" | "ready";
  selectedLevel: CefrLevel | null;
  onLevelChange: (level: CefrLevel) => void;
  onGenerate: () => void;
  generating: boolean;
  quotaRemaining: number;
}) {
  const exhausted = variant === "ready" && quotaRemaining === 0;
  return (
    <Surface padding="intro" className="flex flex-col gap-[26px]">
      {variant === "first-run" ? (
        <>
          <div className="flex flex-col gap-2.5">
            <p className="text-ink font-serif text-[26px]/[1.3]">
              {homeCopy.welcomeLead}
            </p>
            <p className="text-muted text-base/[1.5]">{homeCopy.welcomeBody}</p>
          </div>
          <LevelPicker value={selectedLevel} onChange={onLevelChange} />
        </>
      ) : (
        <p className="text-muted text-base/[1.5]">{homeCopy.aReadyLead}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
        <GenerateButton
          disabled={
            exhausted || (variant === "first-run" && selectedLevel === null)
          }
          busy={generating}
          onClick={onGenerate}
          label={homeCopy.generate}
        />
        {variant === "first-run" ? (
          <TextLink href="/placement" className="min-h-touch">
            {homeCopy.placementLink}
          </TextLink>
        ) : null}
      </div>
    </Surface>
  );
}
