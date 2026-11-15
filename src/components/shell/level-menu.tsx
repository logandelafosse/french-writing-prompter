"use client";

import { useRef } from "react";
import { Menu } from "@base-ui/react/menu";
import type { CefrLevel } from "@/contracts/cefr";
import { CEFR_LEVELS } from "@/contracts/cefr";
import { CEFR_UI_LABELS } from "@/config/cefr-labels";
import { cn } from "@/lib/utils";

export type LevelMenuProps = {
  level: CefrLevel;
  onChange: (level: CefrLevel) => Promise<void>;
};

export function LevelMenu({ level, onChange }: LevelMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <Menu.Root
      onOpenChange={(open, eventDetails) => {
        if (!open && eventDetails.reason === "escape-key") {
          triggerRef.current?.focus();
        }
      }}
    >
      <Menu.Trigger
        ref={triggerRef}
        aria-label={`Niveau CECR ${level}, changer`}
        aria-haspopup="menu"
        className={cn(
          "border-line-strong bg-sheet min-h-touch text-ink inline-flex items-center rounded-[22px] border px-3.5 text-[15px] font-semibold",
          "hover:bg-desk-highlight",
        )}
      >
        <span>
          {level} <span aria-hidden="true">▾</span>
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50" sideOffset={6}>
          <Menu.Popup
            className="border-line bg-sheet rounded-base shadow-pop max-h-[min(24rem,var(--available-height))] min-w-48 overflow-y-auto border p-1"
            role="menu"
          >
            <Menu.RadioGroup
              value={level}
              onValueChange={(value) => {
                const next = value as CefrLevel;
                if (next !== level) {
                  void onChange(next);
                }
              }}
            >
              {CEFR_LEVELS.map((option) => (
                <Menu.RadioItem
                  key={option}
                  value={option}
                  role="menuitemradio"
                  aria-checked={option === level}
                  className={cn(
                    "min-h-touch rounded-base flex cursor-default items-center px-3 py-2 text-[15px] outline-none",
                    "data-highlighted:bg-primary-tint data-checked:font-semibold",
                  )}
                >
                  {option} · {CEFR_UI_LABELS[option]}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
