"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";

const DESKTOP_LINE = 32;
const MOBILE_LINE = 30;

export type RuledTextareaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmitShortcut?: (() => void) | undefined;
  density?: "desktop" | "mobile" | undefined;
  minRows?: number | undefined;
  readOnly?: boolean | undefined;
  id?: string | undefined;
};

function snapToLineHeight(pixels: number, lineHeight: number): number {
  return Math.ceil(pixels / lineHeight) * lineHeight;
}

function subscribeViewport(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function useIsDesktopWriting() {
  return useSyncExternalStore(
    subscribeViewport,
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 640px)").matches,
    () => true,
  );
}

export function RuledTextarea({
  label,
  value,
  onChange,
  onSubmitShortcut,
  density,
  minRows = 8,
  readOnly = false,
  id: idProp,
}: RuledTextareaProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const ref = useRef<HTMLTextAreaElement>(null);
  const isDesktop = useIsDesktopWriting();
  const resolvedDensity =
    density ?? (isDesktop ? ("desktop" as const) : ("mobile" as const));
  const lineHeight = resolvedDensity === "mobile" ? MOBILE_LINE : DESKTOP_LINE;
  const fontSize = resolvedDensity === "mobile" ? 17 : 18;
  const ruleStop = lineHeight - 1;

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const snapped = Math.max(
      minRows * lineHeight,
      snapToLineHeight(el.scrollHeight, lineHeight),
    );
    el.style.height = `${snapped}px`;
  }, [lineHeight, minRows]);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      onSubmitShortcut?.();
    }
  };

  return (
    <div className="focus-within:outline-primary flex flex-col gap-2 focus-within:outline-2 focus-within:outline-offset-2">
      <SectionLabel as="label" htmlFor={id}>
        {label}
      </SectionLabel>
      <textarea
        ref={ref}
        id={id}
        lang="fr"
        spellCheck={false}
        readOnly={readOnly}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          "text-ink m-0 box-border block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-serif outline-none",
          resolvedDensity === "mobile" && "min-h-[720px]",
        )}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: `${lineHeight}px`,
          backgroundImage: `repeating-linear-gradient(transparent 0, transparent ${ruleStop}px, var(--color-rule) ${ruleStop}px, var(--color-rule) ${lineHeight}px)`,
          backgroundAttachment: "local",
        }}
      />
    </div>
  );
}
