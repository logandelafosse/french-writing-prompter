import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonVariantProps } from "./button-variants";

type LinkProps = ComponentProps<typeof Link>;

export type ButtonLinkProps = Omit<LinkProps, "className"> &
  ButtonVariantProps & {
    className?: string | undefined;
  };

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
