import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const writingFocusClassName =
  "focus-within:border-primary focus-within:border-l-primary focus-within:border-l-2 focus-within:outline-primary focus-within:outline-2 focus-within:outline-offset-2";

export type SurfacePadding =
  | "home"
  | "intro"
  | "review"
  | "list"
  | "list-notes"
  | "history"
  | "mobile"
  | "mobile-review"
  | "card";

export type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  padding?: SurfacePadding | undefined;
  variant?: "sheet" | "card" | undefined;
};

const paddingClass: Record<SurfacePadding, string> = {
  home: "p-[36px_44px]",
  intro: "p-[40px_44px]",
  review: "p-[32px_40px_40px]",
  list: "pt-[30px] pr-10 pb-[14px] pl-10",
  "list-notes": "pt-[30px] pr-10 pb-6 pl-10",
  history: "py-2 px-8",
  mobile: "p-[22px_18px]",
  "mobile-review": "p-[22px_18px_26px]",
  card: "p-[16px_18px] gap-2",
};

export function Surface({
  padding = "home",
  variant = "sheet",
  className,
  ...props
}: SurfaceProps) {
  const effectivePadding = variant === "card" ? "card" : padding;

  return (
    <div
      className={cn(
        "rounded-base border-line bg-sheet border",
        variant === "sheet" && "shadow-sheet",
        variant === "card" && "flex flex-col shadow-none",
        paddingClass[effectivePadding],
        className,
      )}
      {...props}
    />
  );
}
