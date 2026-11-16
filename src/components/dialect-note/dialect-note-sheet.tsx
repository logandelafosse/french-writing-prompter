"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import type { DialectNoteScope } from "@/contracts/dialect-note";
import { reviewCopy } from "@/copy/review";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Radio, Textarea } from "@/components/ui/textarea";
import { SectionLabel } from "@/components/ui/section-label";
import type { DialectSheetDraft } from "./sheet-draft";

export type DialectNoteSheetSave = {
  rule: string;
  example: string;
  scope: DialectNoteScope;
};

export function DialectNoteSheet({
  open,
  onOpenChange,
  written,
  tutorProposed,
  draft,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  written: string;
  tutorProposed: string;
  draft: DialectSheetDraft;
  onSave: (note: DialectNoteSheetSave) => Promise<boolean>;
}) {
  const [rule, setRule] = useState(draft.rule);
  const [example, setExample] = useState(draft.example);
  const [scope, setScope] = useState<DialectNoteScope>("word");
  const [saveUi, setSaveUi] = useState<"idle" | "saving">("idle");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="bg-scrim fixed inset-0 z-40" />
        <Dialog.Popup
          aria-modal="true"
          className="bg-sheet sm:max-w-panel sm:shadow-panel fixed z-50 flex flex-col gap-[22px] transition-transform duration-300 max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[90vh] max-sm:w-full max-sm:p-6 max-sm:data-[ending-style]:translate-y-full max-sm:data-[starting-style]:translate-y-full sm:inset-y-0 sm:right-0 sm:w-full sm:p-[36px_40px] sm:data-[ending-style]:translate-x-full sm:data-[starting-style]:translate-x-full"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <SectionLabel tone="dialect">
                {reviewCopy.sheetEyebrow}
              </SectionLabel>
              <Dialog.Title className="text-panel-title m-0 font-semibold">
                {reviewCopy.sheetTitle}
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label={reviewCopy.sheetClose}
              className="rounded-chip text-ink flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent"
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M3 3l12 12M15 3L3 15" />
              </svg>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-line grid grid-cols-2 gap-4 border-y py-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[13px]">
                  {reviewCopy.sheetWritten}
                </span>
                <span lang="fr" className="font-serif text-xl">
                  <span className="bg-dialect-tint px-[3px] py-px">
                    {written}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[13px]">
                  {reviewCopy.sheetProposed}
                </span>
                <span lang="fr" className="text-muted font-serif text-xl">
                  {tutorProposed}
                </span>
              </div>
            </div>
            <form
              className="mt-4 flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (saveUi === "saving") return;
                setSaveUi("saving");
                void onSave({ rule, example, scope }).then((ok) => {
                  setSaveUi("idle");
                  if (ok) onOpenChange(false);
                });
              }}
            >
              <Field
                label={reviewCopy.sheetRule}
                hint={`· ${reviewCopy.sheetRuleHint}`}
              >
                <Textarea
                  lang="fr"
                  value={rule}
                  onChange={(event) => setRule(event.target.value)}
                  className="h-[92px] min-h-[92px] p-[12px_14px] text-lg leading-[1.45]"
                />
              </Field>
              <Field label={reviewCopy.sheetExample}>
                <Input
                  lang="fr"
                  value={example}
                  onChange={(event) => setExample(event.target.value)}
                />
              </Field>
              <fieldset className="m-0 flex flex-col border-0 p-0">
                <legend className="mb-1 p-0 text-[15px] font-semibold">
                  {reviewCopy.sheetScope}
                </legend>
                <label className="min-h-touch flex items-center gap-3 text-base">
                  <Radio
                    name="portee"
                    checked={scope === "word"}
                    onChange={() => setScope("word")}
                  />
                  <span>{reviewCopy.sheetScopeWord(draft.lemma)}</span>
                </label>
                {draft.pattern !== null ? (
                  <label className="min-h-touch flex items-center gap-3 text-base">
                    <Radio
                      name="portee"
                      checked={scope === "pattern"}
                      onChange={() => setScope("pattern")}
                    />
                    <span>{reviewCopy.sheetScopePattern(draft.pattern)}</span>
                  </label>
                ) : null}
              </fieldset>
              <div className="border-line mt-auto flex shrink-0 flex-col gap-3.5 border-t pt-[18px]">
                <p className="text-muted m-0 text-sm leading-normal">
                  {reviewCopy.sheetFooter}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  <span className="text-muted mr-auto hidden text-[13px] sm:inline">
                    {reviewCopy.sheetEsc}
                  </span>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="px-5 text-base font-medium"
                    onClick={() => onOpenChange(false)}
                  >
                    {reviewCopy.sheetCancel}
                  </Button>
                  <Button
                    type="submit"
                    variant="dialect"
                    size="lg"
                    busy={saveUi === "saving"}
                    className="px-6"
                  >
                    {reviewCopy.sheetSave}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
