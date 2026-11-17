"use client";

import { Component, useState, type ReactNode } from "react";
import type { SessionSummary } from "@/contracts/session";
import { historyCopy, historyRowMeta, historyRowTitle } from "@/copy/history";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/states/notice";
import { SectionLabel } from "@/components/ui/section-label";
import { TextLink } from "@/components/ui/text-link";
import { cn } from "@/lib/utils";

export class HistoryRowBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? (
      <Notice title={historyCopy.malformedNotice} />
    ) : (
      this.props.children
    );
  }
}

const glyphClass = {
  evaluated: "bg-primary size-2.5 rounded-[5px]",
  draft_abandoned: "border-muted size-2.5 rounded-[5px] border-2",
  prompt_unused: "bg-disabled-text h-0.5 w-2.5",
  in_progress: "bg-disabled-text h-0.5 w-2.5",
} as const;
const titleClass = {
  evaluated: "font-semibold text-ink",
  draft_abandoned: "font-medium text-ink-2",
  prompt_unused: "font-normal text-muted",
  in_progress: "font-normal text-muted",
} as const;
const kindClass = {
  mistake: "text-mistake",
  standard: "text-standard",
  dialect_note: "text-dialect",
} as const;
const kindLabel = {
  mistake: historyCopy.kindMistake,
  standard: historyCopy.kindStandard,
  dialect_note: historyCopy.kindNote,
} as const;

function correctionValue(entry: SessionSummary["correctionsSummary"][number]) {
  if (entry.kind === "mistake") {
    return (
      <>
        <s className="text-muted">{entry.quote}</s>
        {` → ${entry.suggestion}`}
      </>
    );
  }
  if (entry.kind === "standard") return `${entry.quote} → ${entry.suggestion}`;
  return historyCopy.noteKept(entry.quote);
}

// prettier-ignore
function ExpandedBody({ item }: { item: SessionSummary }) {
  if (item.dataIssues.includes("evaluation_unreadable")) return <Notice title={historyCopy.malformedNotice} />;
  const showCorrections = item.displayStatus === "evaluated" && !item.dataIssues.includes("evaluation_legacy");
  return (
    <div className="flex flex-col gap-[18px] pt-1.5 pb-6 pl-[26px] max-sm:pl-0">
      <div className="flex flex-col gap-1.5">
        <SectionLabel>{historyCopy.prompt}</SectionLabel>
        <p className="text-ink-2 font-serif text-[17px]/[1.45]">{item.promptText}</p>
      </div>
      {item.excerpt ? (
        <div className="flex flex-col gap-1.5">
          <SectionLabel>{historyCopy.text(item.wordCount)}</SectionLabel>
          <p lang="fr" className="font-serif text-[18px]/[1.6]">{item.excerpt}</p>
          {item.displayStatus === "evaluated" ? (
            <TextLink href={`/historique/${item.id}`} compact>{historyCopy.readAll}</TextLink>
          ) : null}
        </div>
      ) : null}
      {showCorrections ? (
        <div className="flex flex-col gap-2">
          <SectionLabel>{historyCopy.corrections}</SectionLabel>
          <ul lang="fr" className="flex list-none flex-col gap-1.5 p-0 font-serif text-[17px]/[1.4]">
            {item.correctionsSummary.map((entry, index) => (
              <li key={`${entry.kind}-${index}`} className="flex flex-wrap gap-0.5 gap-x-3">
                <span className={cn(kindClass[entry.kind], "flex-[0_0_150px] text-[13px]/6 font-semibold")}>{kindLabel[entry.kind]}</span>
                <span>{correctionValue(entry)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// prettier-ignore
export function HistoryRow({ item, defaultExpanded = false }: { item: SessionSummary; defaultExpanded?: boolean }) {
  const expandable = item.displayStatus !== "prompt_unused";
  const [open, setOpen] = useState(defaultExpanded);
  const panelId = `history-panel-${item.id}`;
  const header = (
    <>
      <span aria-hidden className={glyphClass[item.displayStatus]} />
      <span className="flex min-w-0 flex-[1_1_300px] flex-col gap-0.5">
        <span className={cn("text-[18px]", titleClass[item.displayStatus])}>{historyRowTitle(item)}</span>
        <span className="text-muted text-sm">{historyRowMeta(item)}</span>
      </span>
      {expandable ? <span aria-hidden className="text-muted text-sm">{open ? "▾" : "▸"}</span> : null}
    </>
  );
  if (!expandable) return <div className="min-h-row flex flex-wrap items-center gap-1 gap-x-4 py-2">{header}</div>;
  return (
    <div>
      <Button variant="text" aria-expanded={open} aria-controls={panelId} className="text-ink hover:text-ink min-h-row flex w-full flex-wrap items-center justify-start gap-1 gap-x-4 px-0 py-2 text-left no-underline" onClick={() => setOpen((c) => !c)}>{header}</Button>
      <div id={panelId} hidden={!open}>{open ? <ExpandedBody item={item} /> : null}</div>
    </div>
  );
}
