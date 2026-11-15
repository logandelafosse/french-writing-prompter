import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

type SectionLabelElement = "span" | "h2" | "label" | "legend";

type SectionLabelProps<T extends SectionLabelElement> = {
  as?: T | undefined;
  tone?: "muted" | "primary" | "dialect" | undefined;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

const toneClass: Record<
  NonNullable<SectionLabelProps<SectionLabelElement>["tone"]>,
  string
> = {
  muted: "text-muted",
  primary: "text-primary",
  dialect: "text-dialect",
};

export function SectionLabel<T extends SectionLabelElement = "span">({
  as,
  tone = "muted",
  className,
  ...props
}: SectionLabelProps<T>) {
  const Component = (as ?? "span") as ElementType;
  return (
    <Component
      className={cn("text-label uppercase", toneClass[tone], className)}
      {...props}
    />
  );
}
