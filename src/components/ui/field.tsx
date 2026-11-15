"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode | undefined;
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string | undefined;
  }>;
  className?: string | undefined;
}

export function Field({ label, hint, children, className }: FieldProps) {
  const controlId = useId();
  const hintId = hint ? `${controlId}-hint` : undefined;

  if (!isValidElement(children)) {
    throw new Error("Field children must be a single React element");
  }

  const describedBy = [children.props["aria-describedby"], hintId]
    .filter(Boolean)
    .join(" ");

  const control = cloneElement(children, {
    id: controlId,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
  });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={controlId} className="text-ink text-[15px] font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
      {control}
    </div>
  );
}
