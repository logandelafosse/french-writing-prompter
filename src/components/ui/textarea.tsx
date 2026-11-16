"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "border-input-border text-ink placeholder:text-muted rounded-base focus-visible:ring-primary min-h-[12rem] w-full resize-y border bg-transparent p-3 text-[17px] leading-8 focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
