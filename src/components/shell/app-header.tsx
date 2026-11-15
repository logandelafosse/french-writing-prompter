import Link from "next/link";
import { APP_TAGLINE, APP_WORDMARK } from "@/config/app-brand";
import type { CefrLevel } from "@/contracts/cefr";
import type { QuotaState } from "@/modules/quota-manager/quota-db-store";
import { TextLink } from "@/components/ui/text-link";
import { LevelMenu } from "./level-menu";
import { QuotaText } from "./quota-text";
import { cn } from "@/lib/utils";

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
          {APP_WORDMARK}
          <span className="text-mistake">.</span>
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
          <span>
            {APP_WORDMARK}
            <span className="text-mistake">.</span>
          </span>
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
