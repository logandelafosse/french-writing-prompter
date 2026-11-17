import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type TextLinkProps = Omit<ComponentProps<typeof Link>, "compact"> & {
  compact?: boolean | undefined;
};

export function TextLink({
  className,
  compact = false,
  ...props
}: TextLinkProps) {
  return (
    <Link
      className={cn(
        "text-primary hover:text-primary-hover inline-flex items-center text-[15px] font-medium",
        compact ? "min-h-touch sm:min-h-8" : "min-h-touch",
        className,
      )}
      {...props}
    />
  );
}
