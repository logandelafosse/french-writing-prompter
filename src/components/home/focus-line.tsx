import type { FocusItem } from "@/contracts/focus";
import { homeCopy } from "@/copy/fr";
import { SectionLabel } from "@/components/ui/section-label";
import { TextLink } from "@/components/ui/text-link";
import { GenerateButton } from "@/components/writing/generate-button";
import { cn } from "@/lib/utils";

export type FocusLineVariant = "inline" | "stacked" | "hero";

export function FocusLine({
  focus,
  variant,
  generate,
  source = "auto",
}: {
  focus: readonly FocusItem[];
  variant: FocusLineVariant;
  source?: "auto" | "practice";
  generate?: {
    onGenerate: () => void;
    generating: boolean;
    disabled: boolean;
  };
}) {
  if (focus.length === 0) return null;
  const reason =
    source === "practice"
      ? homeCopy.focusReasonPinned
      : homeCopy.focusReasonAuto;
  const joined = focus.map((item) => item.inlineName).join(" · ");
  const label = (
    <SectionLabel tone="primary">{homeCopy.focusLabel}</SectionLabel>
  );

  if (variant === "hero") {
    return (
      <div
        className="border-line-strong flex flex-col gap-2.5 border-y py-5"
        role="region"
        aria-label={homeCopy.focusLabel}
      >
        {label}
        {focus.map((item) => (
          <p
            key={item.id}
            lang="fr"
            className="text-ink m-0 font-serif text-[22px]/[1.35]"
          >
            {item.name}
          </p>
        ))}
        <p className="text-muted m-0 text-sm/[1.45]">{reason}</p>
        {generate ? (
          <div className="mt-auto flex flex-col gap-1.5">
            <GenerateButton
              disabled={generate.disabled}
              busy={generate.generating}
              onClick={generate.onGenerate}
              label={homeCopy.generate}
            />
            <TextLink href="/carnet" className="justify-center">
              {homeCopy.focusChange}
            </TextLink>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <p
      className={cn(
        variant === "inline"
          ? "flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-base"
          : "flex flex-col gap-1 px-2 text-[15px]/[1.4]",
      )}
      role="region"
      aria-label={homeCopy.focusLabel}
    >
      {label}
      <span lang="fr">{joined}</span>
    </p>
  );
}
