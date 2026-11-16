"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = ComponentProps<"textarea">;
export type InputProps = ComponentProps<"input">;
export type RadioProps = Omit<ComponentProps<"input">, "type">;

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

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "border-input-border text-ink rounded-base focus-visible:ring-primary h-12 w-full border bg-white px-3.5 font-serif text-lg focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Radio({ className, ...props }: RadioProps) {
  // prettier-ignore
  return <input type="radio" className={cn("accent-dialect m-0 size-5", className)} {...props} />;
}
