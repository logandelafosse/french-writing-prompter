import type { ReactNode } from "react";
import type { Correction } from "@/contracts/correction";
import { reviewCopy } from "@/copy/review";
import { cn } from "@/lib/utils";

type MarkedKind = "mistake" | "standard" | "dialect_check";

type Mark = Pick<Correction, "id" | "ordinal"> & {
  kind: MarkedKind;
  span: { start: number; end: number };
};

function markKind(
  item: Pick<Correction, "kind" | "status" | "span">,
): MarkedKind | null {
  if (item.span === null) return null;
  if (item.status === "confirmed_dialect" || item.status === "overturned")
    return null;
  if (item.kind === "dialect_check" && item.status === "confirmed_mistake") {
    return "mistake";
  }
  return item.kind;
}

function markClass(kind: Mark["kind"]) {
  if (kind === "standard") {
    return "bg-transparent bg-no-repeat py-px text-inherit";
  }
  if (kind === "dialect_check") {
    return "[background-size:100%_100%] bg-[image:linear-gradient(var(--color-dialect-tint),var(--color-dialect-tint))] bg-no-repeat px-0.5 py-px text-inherit";
  }
  return "[background-size:100%_100%] bg-[image:linear-gradient(var(--color-mistake-tint),var(--color-mistake-tint))] bg-no-repeat px-0.5 py-px text-inherit";
}

function markerClass(kind: Mark["kind"]) {
  if (kind === "standard") {
    return "rounded-marker border-standard text-marker border bg-white px-[5px] font-sans font-bold text-standard no-underline";
  }
  if (kind === "dialect_check") {
    return "rounded-marker-dialect bg-dialect text-marker px-[5px] py-px font-sans font-bold text-white no-underline";
  }
  return "rounded-marker bg-mistake text-marker px-1.5 py-px font-sans font-bold text-white no-underline";
}

function paragraphRanges(text: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const divider = /\n\s*\n/g;
  let last = 0;
  for (const match of text.matchAll(divider)) {
    ranges.push({ start: last, end: match.index });
    last = match.index + match[0].length;
  }
  ranges.push({ start: last, end: text.length });
  return ranges.filter((range) => range.end > range.start);
}

function renderRange(
  text: string,
  start: number,
  end: number,
  marks: Mark[],
  animate: boolean,
) {
  const nodes: ReactNode[] = [];
  let cursor = start;
  for (const item of marks) {
    if (item.span.end <= start || item.span.start >= end) continue;
    const from = Math.max(item.span.start, start);
    const to = Math.min(item.span.end, end);
    if (from > cursor) nodes.push(text.slice(cursor, from));
    nodes.push(
      <mark
        key={item.id}
        data-kind={item.kind}
        data-animate={animate ? "" : undefined}
        className={cn(
          markClass(item.kind),
          animate && "motion-safe:animate-mark-paint",
        )}
        style={
          animate
            ? { animationDelay: `${(item.ordinal - 1) * 60}ms` }
            : undefined
        }
      >
        {text.slice(from, to)}
      </mark>,
      <sup key={`${item.id}-n`} className="ml-[3px]">
        <a
          href={`#correction-${item.ordinal}`}
          aria-label={reviewCopy.srMark(item.kind, item.ordinal)}
          className={markerClass(item.kind)}
        >
          {item.kind === "dialect_check"
            ? `${item.ordinal}\u202F?`
            : item.ordinal}
        </a>
      </sup>,
      <span key={`${item.id}-sr`} className="sr-only">
        ({reviewCopy.srMark(item.kind, item.ordinal)})
      </span>,
    );
    cursor = to;
  }
  if (cursor < end) nodes.push(text.slice(cursor, end));
  return nodes;
}

export function MarkedText({
  text,
  corrections,
  animate = false,
}: {
  text: string;
  corrections: Pick<
    Correction,
    "id" | "ordinal" | "kind" | "span" | "status"
  >[];
  animate?: boolean | undefined;
}) {
  const marks = corrections.flatMap((item) => {
    const kind = markKind(item);
    return kind !== null && item.span !== null
      ? [{ id: item.id, ordinal: item.ordinal, kind, span: item.span }]
      : [];
  });
  marks.sort((a, b) => a.span.start - b.span.start);
  return (
    <div
      lang="fr"
      className="text-writing-marked flex flex-col gap-3.5 font-serif max-sm:text-[17px]/[32px] sm:gap-4"
    >
      {paragraphRanges(text).map((range) => (
        <p key={range.start} className="m-0">
          {renderRange(text, range.start, range.end, marks, animate)}
        </p>
      ))}
    </div>
  );
}
