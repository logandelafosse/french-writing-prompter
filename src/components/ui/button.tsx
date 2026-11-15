"use client";

import { Button as BaseUIButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonVariantProps } from "./button-variants";

export type ButtonProps = Omit<
  ComponentProps<typeof BaseUIButton>,
  "className"
> &
  ButtonVariantProps & {
    className?: string | undefined;
    busy?: boolean | undefined;
  };

export function Button({
  variant,
  size,
  busy = false,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled === true || busy;

  return (
    <BaseUIButton
      type={type}
      disabled={isDisabled}
      aria-busy={busy ? true : undefined}
      className={cn(
        buttonVariants({ variant, size }),
        busy && "bg-busy disabled:bg-busy text-white disabled:text-white",
        className,
      )}
      {...props}
    />
  );
}
