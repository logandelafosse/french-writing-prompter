import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type PageTitleProps = ComponentProps<"h1"> & {
  size?: "default" | "step" | undefined;
};

export function PageTitle({
  size = "default",
  className,
  children,
  ...props
}: PageTitleProps) {
  return (
    <h1
      className={cn(
        "text-ink",
        size === "step" ? "text-step-title" : "text-page-title",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}
