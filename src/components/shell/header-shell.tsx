"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Menu } from "@base-ui/react/menu";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { APP_TAGLINE, APP_WORDMARK } from "@/config/app-brand";
import { CEFR_UI_LABELS } from "@/contracts/cefr";
import { TextLink } from "@/components/ui/text-link";
import type { CefrLevel } from "@/contracts/cefr";
import { CEFR_LEVELS } from "@/contracts/cefr";
import {
  LevelGetResponse,
  LevelPutResponse,
  QuotaGetResponse,
} from "@/contracts/api";
import { fetchJson } from "@/lib/http";
import { cn } from "@/lib/utils";
import type { QuotaState } from "@/modules/quota-manager/quota-store";

export function quotaMessage(
  quota: QuotaState,
  firstRun: boolean,
  compact?: boolean,
): string {
  if (firstRun) {
    return "3 consignes aujourd'hui";
  }
  if (quota.remaining === 0) {
    return compact ? "3 sur 3 prises" : "3 consignes sur 3 prises";
  }
  if (compact) {
    return `Reste ${quota.remaining} sur 3`;
  }
  if (quota.remaining === 1) {
    return "Reste 1 consigne sur 3";
  }
  return `Reste ${quota.remaining} consignes sur 3`;
}

export function QuotaText({
  quota,
  firstRun,
  compact,
}: {
  quota: QuotaState;
  firstRun: boolean;
  compact?: boolean | undefined;
}) {
  return (
    <span className="text-muted text-[15px] sm:text-[14px]">
      {quotaMessage(quota, firstRun, compact)}
    </span>
  );
}

export function LevelMenu({
  level,
  onChange,
}: {
  level: CefrLevel;
  onChange: (level: CefrLevel) => Promise<void>;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <Menu.Root
      onOpenChange={(open, eventDetails) => {
        if (!open && eventDetails.reason === "escape-key") {
          triggerRef.current?.focus();
        }
      }}
    >
      <Menu.Trigger
        ref={triggerRef}
        aria-label={`Niveau CECR ${level}, changer`}
        aria-haspopup="menu"
        className={cn(
          "border-line-strong bg-sheet min-h-touch text-ink inline-flex items-center rounded-[22px] border px-3.5 text-[15px] font-semibold",
          "hover:bg-desk-highlight",
        )}
      >
        <span>
          {level} <span aria-hidden="true">▾</span>
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50" sideOffset={6}>
          <Menu.Popup
            className="border-line bg-sheet rounded-base shadow-pop max-h-[min(24rem,var(--available-height))] min-w-48 overflow-y-auto border p-1"
            role="menu"
          >
            <Menu.RadioGroup
              value={level}
              onValueChange={(value) => {
                const next = value as CefrLevel;
                if (next !== level) {
                  void onChange(next);
                }
              }}
            >
              {CEFR_LEVELS.map((option) => (
                <Menu.RadioItem
                  key={option}
                  value={option}
                  role="menuitemradio"
                  aria-checked={option === level}
                  className={cn(
                    "min-h-touch rounded-base flex cursor-default items-center px-3 py-2 text-[15px] outline-none",
                    "data-highlighted:bg-primary-tint data-checked:font-semibold",
                  )}
                >
                  {option} · {CEFR_UI_LABELS[option]}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export type AppHeaderProps = {
  variant: "full" | "placement";
  level: CefrLevel | null;
  quota: QuotaState | null;
  placementLink?: {
    href: string;
    label: "Je connais mon niveau" | "Finir plus tard";
  } | null;
  current?: "historique" | undefined;
  onLevelChange?: (level: CefrLevel) => Promise<void>;
};

export function AppHeader({
  variant,
  level,
  quota,
  placementLink = null,
  current,
  onLevelChange,
}: AppHeaderProps) {
  if (variant === "placement") {
    return (
      <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 sm:px-10 sm:py-[18px]">
        <Link
          href="/"
          className="text-wordmark-sm sm:text-wordmark text-ink font-bold tracking-[-0.03em] no-underline"
        >
          <h1 className="font-[inherit] text-[length:inherit] leading-[inherit] tracking-[inherit]">
            {APP_WORDMARK}
            <span className="text-mistake">.</span>
          </h1>
        </Link>
        {placementLink ? (
          <TextLink href={placementLink.href} compact>
            {placementLink.label}
          </TextLink>
        ) : null}
      </header>
    );
  }

  const firstRun = level === null;
  const quotaState =
    quota ??
    ({
      used: 0,
      remaining: 3,
      max: 3,
      resetsAt: new Date().toISOString(),
    } satisfies QuotaState);

  return (
    <header className="border-line/0 flex flex-col gap-0.5 px-5 pt-3.5 pb-1.5 sm:gap-2 sm:px-10 sm:py-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-6">
        <Link
          href="/"
          className="text-wordmark-sm sm:text-wordmark min-h-touch text-ink inline-flex flex-wrap items-baseline gap-x-3 gap-y-0 font-bold tracking-[-0.03em] no-underline"
        >
          <h1 className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-0 font-[inherit] text-[length:inherit] leading-[inherit] tracking-[inherit]">
            {APP_WORDMARK}
            <span className="text-mistake">.</span>
          </h1>
          <span className="text-muted hidden text-[13px] font-normal sm:inline">
            {APP_TAGLINE}
          </span>
        </Link>
        {level && onLevelChange ? (
          <LevelMenu level={level} onChange={onLevelChange} />
        ) : null}
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-5 gap-y-2 sm:ml-auto sm:gap-x-[22px]",
        )}
      >
        <nav
          aria-label="Navigation"
          className="flex flex-wrap items-center gap-x-5 text-[15px] font-medium sm:gap-x-[22px]"
        >
          <TextLink
            href="/history"
            className={cn(
              "min-h-9",
              current === "historique"
                ? "font-semibold underline decoration-2 underline-offset-[6px]"
                : "no-underline",
            )}
            aria-current={current === "historique" ? "page" : undefined}
          >
            Historique
          </TextLink>
        </nav>
        <span className="ml-auto sm:ml-0">
          <span className="sm:hidden">
            <QuotaText quota={quotaState} firstRun={firstRun} compact />
          </span>
          <span className="hidden sm:inline">
            <QuotaText quota={quotaState} firstRun={firstRun} />
          </span>
        </span>
      </div>
    </header>
  );
}

type HeaderContextValue = {
  refreshQuota: () => Promise<void>;
};

export const HEADER_SHELL_REFRESH_EVENT = "fwp:header-shell-refresh";

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function useHeaderShell(): HeaderContextValue {
  const ctx = useContext(HeaderContext);
  if (!ctx) {
    throw new Error("useHeaderShell must be used within HeaderShell");
  }
  return ctx;
}

export function HeaderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);

  const refreshQuota = useCallback(async () => {
    const result = await fetchJson("/api/quota", QuotaGetResponse);
    if (result.ok) setQuota(result.value);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      const [levelRes, quotaRes] = await Promise.all([
        fetchJson("/api/level", LevelGetResponse),
        fetchJson("/api/quota", QuotaGetResponse),
      ]);
      if (cancelled) return;
      if (levelRes.ok) setLevel(levelRes.value.level);
      if (quotaRes.ok) setQuota(quotaRes.value);
    }
    const onRefresh = () => void loadAll();
    void loadAll();
    window.addEventListener(HEADER_SHELL_REFRESH_EVENT, onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(HEADER_SHELL_REFRESH_EVENT, onRefresh);
    };
  }, []);

  const onLevelChange = useCallback(async (next: CefrLevel) => {
    const result = await fetchJson("/api/level", LevelPutResponse, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: next }),
    });
    if (result.ok) {
      setLevel(next);
    }
  }, []);

  const current = pathname.startsWith("/history")
    ? ("historique" as const)
    : undefined;

  const contextValue = useMemo(() => ({ refreshQuota }), [refreshQuota]);

  return (
    <HeaderContext.Provider value={contextValue}>
      <AppHeader
        variant="full"
        level={level}
        quota={quota}
        current={current}
        onLevelChange={onLevelChange}
      />
      {children}
    </HeaderContext.Provider>
  );
}
