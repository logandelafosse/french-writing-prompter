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
import { CEFR_UI_LABELS, parseCefrLevel } from "@/contracts/cefr";
import { TextLink } from "@/components/ui/text-link";
import type { CefrLevel } from "@/contracts/cefr";
import { CEFR_LEVELS } from "@/contracts/cefr";
import {
  LevelGetResponse,
  LevelPutResponse,
  QuotaGetResponse,
  type QuotaGetDto,
} from "@/contracts/api";
import type { TodayGetDto } from "@/contracts/today";
import { fetchJson } from "@/lib/http";
import { cn } from "@/lib/utils";

export function nextLevelFromMenuValue(
  value: string,
  current: CefrLevel,
): CefrLevel | null {
  const next = parseCefrLevel(value);
  if (next === null || next === current) {
    return null;
  }
  return next;
}

export function quotaMessage(
  quota: QuotaGetDto,
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
  quota: QuotaGetDto;
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
  open,
  onOpenChange,
}: {
  level: CefrLevel;
  onChange: (level: CefrLevel) => Promise<void>;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <Menu.Root
      open={open}
      onOpenChange={(next, eventDetails) => {
        onOpenChange?.(next);
        if (!next && eventDetails.reason === "escape-key") {
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
                const next = nextLevelFromMenuValue(String(value), level);
                if (next !== null) {
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
                    "min-h-touch rounded-base flex cursor-default items-center px-3 py-2 text-[15px]",
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
  quota: QuotaGetDto | null;
  levelReady: boolean;
  quotaReady: boolean;
  placementLink?:
    | {
        href: string;
        label: "Je connais mon niveau" | "Finir plus tard";
      }
    | null
    | undefined;
  current?: "carnet" | "historique" | undefined;
  onLevelChange?: (level: CefrLevel) => Promise<void>;
  levelMenuOpen?: boolean | undefined;
  onLevelMenuOpen?: ((open: boolean) => void) | undefined;
};

type PlacementHeaderLink = {
  href: string;
  label: "Je connais mon niveau" | "Finir plus tard";
} | null;

export function AppHeader({
  variant,
  level,
  quota,
  levelReady,
  quotaReady,
  placementLink = null,
  current,
  onLevelChange,
  levelMenuOpen,
  onLevelMenuOpen,
}: AppHeaderProps) {
  if (variant === "placement") {
    return (
      <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 sm:px-10 sm:py-[18px]">
        <Link
          href="/"
          className="text-wordmark-sm sm:text-wordmark text-ink min-h-touch inline-flex items-center font-bold tracking-[-0.03em] no-underline"
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

  const showQuota = levelReady && quotaReady && quota !== null;
  const firstRun = levelReady && level === null;

  return (
    <header className="border-line/0 flex flex-col gap-0.5 px-5 pt-3.5 pb-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-2 sm:px-10 sm:py-[18px]">
      <div className="min-h-touch flex items-center justify-between gap-3 sm:contents">
        <Link
          href="/"
          className="text-wordmark-sm sm:text-wordmark text-ink min-h-touch inline-flex flex-wrap items-center gap-x-3 gap-y-0 font-bold tracking-[-0.03em] no-underline sm:items-baseline"
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
          <LevelMenu
            level={level}
            onChange={onLevelChange}
            open={levelMenuOpen}
            onOpenChange={onLevelMenuOpen}
          />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:contents">
        <nav
          aria-label="Navigation"
          className="flex flex-wrap items-center gap-x-5 text-[15px] font-medium sm:gap-x-[22px]"
        >
          <TextLink
            href="/carnet"
            className={cn(
              "min-h-touch",
              current === "carnet"
                ? "font-semibold underline decoration-2 underline-offset-[6px]"
                : "no-underline",
            )}
            aria-current={current === "carnet" ? "page" : undefined}
          >
            Carnet
          </TextLink>
          <TextLink
            href="/historique"
            className={cn(
              "min-h-touch",
              current === "historique"
                ? "font-semibold underline decoration-2 underline-offset-[6px]"
                : "no-underline",
            )}
            aria-current={current === "historique" ? "page" : undefined}
          >
            Historique
          </TextLink>
        </nav>
        {showQuota ? (
          <span className="ml-auto sm:ml-0">
            <span className="sm:hidden">
              <QuotaText quota={quota} firstRun={firstRun} compact />
            </span>
            <span className="hidden sm:inline">
              <QuotaText quota={quota} firstRun={firstRun} />
            </span>
          </span>
        ) : null}
      </div>
    </header>
  );
}

type HeaderContextValue = {
  level: CefrLevel | null;
  refreshQuota: () => Promise<void>;
  refreshShell: (optimisticLevel?: CefrLevel) => Promise<void>;
  syncFromToday: (payload: TodayGetDto) => void;
  setPlacementLink: (link: PlacementHeaderLink) => void;
  openLevelMenu: () => void;
};

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
  const placementPath = pathname.startsWith("/placement");
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [quota, setQuota] = useState<QuotaGetDto | null>(null);
  const [levelReady, setLevelReady] = useState(false);
  const [quotaReady, setQuotaReady] = useState(false);
  const [placementLink, setPlacementLink] = useState<PlacementHeaderLink>(null);
  const [levelMenuOpen, setLevelMenuOpen] = useState(false);
  const quotaFetchGen = useRef(0);
  const levelFetchGen = useRef(0);

  const fetchQuota = useCallback(async () => {
    const gen = ++quotaFetchGen.current;
    const result = await fetchJson("/api/quota", QuotaGetResponse);
    if (gen !== quotaFetchGen.current) {
      return;
    }
    if (result.ok) {
      setQuota(result.value);
      setQuotaReady(true);
    }
  }, []);

  const fetchLevel = useCallback(async () => {
    const gen = ++levelFetchGen.current;
    const result = await fetchJson("/api/level", LevelGetResponse);
    if (gen !== levelFetchGen.current) {
      return;
    }
    if (result.ok) {
      setLevel(result.value.level);
      setLevelReady(true);
    }
  }, []);

  const refreshQuota = useCallback(async () => {
    await fetchQuota();
  }, [fetchQuota]);

  const refreshShell = useCallback(
    async (optimisticLevel?: CefrLevel) => {
      if (optimisticLevel !== undefined) {
        levelFetchGen.current += 1;
        setLevel(optimisticLevel);
        setLevelReady(true);
      }
      await Promise.all([fetchLevel(), fetchQuota()]);
    },
    [fetchLevel, fetchQuota],
  );

  const syncFromToday = useCallback((p: TodayGetDto) => {
    setLevel(p.level);
    setLevelReady(true);
    setQuota(p.quota);
    setQuotaReady(true);
  }, []);

  const skipHeaderFetch = pathname === "/" || placementPath;

  useEffect(() => {
    if (skipHeaderFetch) {
      return;
    }
    let cancelled = false;
    async function loadAll() {
      await fetchLevel();
      if (cancelled) return;
      await fetchQuota();
    }
    void loadAll();
    return () => {
      cancelled = true;
      levelFetchGen.current += 1;
    };
  }, [fetchLevel, fetchQuota, skipHeaderFetch]);

  const onLevelChange = useCallback(
    async (next: CefrLevel) => {
      const result = await fetchJson("/api/level", LevelPutResponse, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: next }),
      });
      if (result.ok) {
        levelFetchGen.current += 1;
        setLevel(next);
        setLevelReady(true);
        await refreshQuota();
      }
    },
    [refreshQuota],
  );

  const current = pathname.startsWith("/carnet")
    ? ("carnet" as const)
    : pathname.startsWith("/historique")
      ? ("historique" as const)
      : undefined;

  const openLevelMenu = useCallback(() => setLevelMenuOpen(true), []);
  // prettier-ignore
  const contextValue = useMemo(() => ({ level, refreshQuota, refreshShell, syncFromToday, setPlacementLink, openLevelMenu }), [level, openLevelMenu, refreshQuota, refreshShell, syncFromToday]);

  return (
    <HeaderContext.Provider value={contextValue}>
      <AppHeader
        variant={placementPath ? "placement" : "full"}
        level={level}
        quota={quota}
        levelReady={levelReady}
        quotaReady={quotaReady}
        placementLink={placementPath ? placementLink : null}
        current={current}
        onLevelChange={onLevelChange}
        levelMenuOpen={levelMenuOpen}
        onLevelMenuOpen={setLevelMenuOpen}
      />
      {children}
    </HeaderContext.Provider>
  );
}
