"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  DialectNoteCreateResponse,
  DialectNoteListResponse,
  DialectNotePatchResponse,
  WeaknessesGetResponse,
} from "@/contracts/api";
import type { DialectNote } from "@/contracts/dialect-note";
import type { Weakness } from "@/contracts/weakness";
import {
  carnetCopy,
  dialectNoteIsNew,
  formatDialectNoteMeta,
  formatWeaknessMeta,
} from "@/copy/carnet";
import { homeCopy } from "@/copy/fr";
import { fetchJson, messageFromFetchError } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { Surface } from "@/components/ui/surface";
import { ErrorAlert } from "@/components/states/error-alert";
import {
  DialectNoteSheet,
  type DialectNoteSheetSave,
} from "@/components/dialect-note/dialect-note-sheet";

// prettier-ignore
type LoadUi = { status: "loading" } | { status: "ready"; notes: DialectNote[]; weaknesses: Weakness[] } | { status: "error" };
// prettier-ignore
type SheetUi = { status: "closed" } | { status: "new" } | { status: "edit"; note: DialectNote };
// prettier-ignore
const emptyDraft = { lemma: "", example: "", pattern: null, rule: "", scope: "word" as const };

export function CarnetPage({ now = () => new Date() }: { now?: () => Date }) {
  const [loadUi, setLoadUi] = useState<LoadUi>({ status: "loading" });
  const [sheet, setSheet] = useState<SheetUi>({ status: "closed" });
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  // prettier-ignore
  const load = useCallback(async () => {
    const [notesResult, weakResult] = await Promise.all([
      fetchJson("/api/dialect-notes", DialectNoteListResponse),
      fetchJson("/api/weaknesses", WeaknessesGetResponse),
    ]);
    setLoadUi(
      notesResult.ok && weakResult.ok
        ? { status: "ready", notes: notesResult.value.notes, weaknesses: weakResult.value.weaknesses }
        : { status: "error" },
    );
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial carnet load
    void load();
  }, [load]);

  const saveSheet = async (note: DialectNoteSheetSave, signal: AbortSignal) => {
    if (sheet.status === "closed") return homeCopy.loadError;
    const creating = sheet.status === "new";
    // prettier-ignore
    const init = { headers: { "Content-Type": "application/json" }, signal, body: JSON.stringify(note) };
    const result = creating
      ? // prettier-ignore
        await fetchJson("/api/dialect-notes", DialectNoteCreateResponse, { method: "POST", ...init })
      : // prettier-ignore
        await fetchJson(`/api/dialect-notes/${sheet.note.id}`, DialectNotePatchResponse, { method: "PATCH", ...init });
    if (signal.aborted) return homeCopy.loadError;
    if (!result.ok)
      return messageFromFetchError(result.error, homeCopy.loadError);
    setSheet({ status: "closed" });
    await load();
    return null;
  };

  const notes = loadUi.status === "ready" ? loadUi.notes : [];
  const weaknesses = loadUi.status === "ready" ? loadUi.weaknesses : [];
  const editNote = sheet.status === "edit" ? sheet.note : null;
  // prettier-ignore
  const draft = editNote
    ? { lemma: editNote.form, example: editNote.example ?? "", pattern: null, rule: editNote.rule, scope: editNote.scope }
    : emptyDraft;

  // prettier-ignore
  return (
    <main className="max-w-list mx-auto flex w-full flex-col gap-7 px-6 py-5 pb-20">
      <PageTitle>{carnetCopy.title}</PageTitle>
      {loadUi.status === "error" ? <ErrorAlert lead={homeCopy.loadError} onRetry={() => void load()} /> : null}
      <Surface padding="list" className="flex flex-col max-sm:p-[22px_18px]">
        <div className="flex flex-col gap-1 pb-4">
          <h2 className="text-section-title m-0">{carnetCopy.weakTitle}</h2>
          <p className="text-muted m-0 text-[15px]">{carnetCopy.weakIntro}</p>
        </div>
        <div aria-live="polite">
          {loadUi.status === "ready" && weaknesses.length === 0 ? (
            <p className="border-line text-muted m-0 border-t py-4 text-[15px]">{carnetCopy.weakEmpty}</p>
          ) : null}
          {weaknesses.map((weakness) => (
            <CarnetWeaknessRow key={weakness.category} weakness={weakness} now={now} />
          ))}
        </div>
      </Surface>
      <Surface padding="list-notes" className="flex flex-col max-sm:p-[22px_18px]">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-section-title m-0">{carnetCopy.notesTitle}</h2>
            <p className="text-muted m-0 text-[15px]">{carnetCopy.notesIntro}</p>
          </div>
          <Button ref={addRef} variant="outline-dialect" onClick={() => setSheet({ status: "new" })}>
            {carnetCopy.notesAdd}
          </Button>
        </div>
        <div aria-live="polite">
          {loadUi.status === "ready" && notes.length === 0 ? (
            <p className="border-line text-muted m-0 border-t py-4 text-[15px]">{carnetCopy.notesEmpty}</p>
          ) : null}
          {notes.map((note) => (
            <DialectNoteRow
              key={note.id}
              note={note}
              now={now}
              confirming={confirmingId === note.id}
              onEdit={() => setSheet({ status: "edit", note })}
              onAskDelete={() => setConfirmingId(note.id)}
              onKeep={() => setConfirmingId(null)}
              onConfirmDelete={async () => {
                const result = await fetchJson(`/api/dialect-notes/${note.id}`, z.undefined(), { method: "DELETE" });
                setConfirmingId(null);
                if (!result.ok) { setLoadUi({ status: "error" }); return; }
                await load();
                addRef.current?.focus();
              }}
            />
          ))}
        </div>
      </Surface>
      {sheet.status === "closed" ? null : (
        <DialectNoteSheet
          key={editNote?.id ?? "new"}
          open
          mode={sheet.status}
          onOpenChange={(open) => { if (!open) setSheet({ status: "closed" }); }}
          written=""
          tutorProposed=""
          draft={draft}
          onSave={saveSheet}
        />
      )}
    </main>
  );
}

function DialectNoteRow({
  // prettier-ignore
  note,
  now,
  confirming,
  onEdit,
  onAskDelete,
  onKeep,
  onConfirmDelete,
}: {
  // prettier-ignore
  note: DialectNote;
  now: () => Date;
  confirming: boolean;
  // prettier-ignore
  onEdit: () => void;
  onAskDelete: () => void;
  onKeep: () => void;
  onConfirmDelete: () => void | Promise<void>;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);
  const onKeepRef = useRef(onKeep);
  useEffect(() => {
    onKeepRef.current = onKeep;
    if (!confirming) return;
    keepRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onKeepRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, onKeep]);
  const isNew = dialectNoteIsNew(note.createdAt, now);
  const meta = formatDialectNoteMeta(note, now).replace(/ · nouvelle$/, "");
  if (confirming) {
    // prettier-ignore
    return (
      <div role="alertdialog" aria-label={carnetCopy.deleteLabel} className="border-line flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 border-t py-4">
        <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
          <p className="text-ink m-0 text-[15px] font-semibold">{carnetCopy.deleteLead}</p>
          <p className="text-ink-2 m-0 text-[15px]/[1.45]">{carnetCopy.deleteBody}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button ref={keepRef} variant="secondary-strong" onClick={onKeep}>{carnetCopy.deleteKeep}</Button>
          <Button variant="primary" onClick={() => { void onConfirmDelete(); }}>{carnetCopy.notesDelete}</Button>
        </div>
      </div>
    );
  }
  // prettier-ignore
  return (
    <article className="border-line flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t py-4">
      <div className="flex min-w-0 flex-1 basis-[380px] flex-col gap-1">
        <p lang="fr" className="m-0 font-serif text-xl leading-[1.35]">{note.rule}</p>
        {note.example ? <p lang="fr" className="text-ink-2 m-0 font-serif text-[17px] italic">{note.example}</p> : null}
        <p className="text-muted m-0 text-sm">
          {meta}
          {isNew ? <><span>{" · "}</span><span className="text-dialect font-semibold">{carnetCopy.metaNew}</span></> : null}
        </p>
      </div>
      <div className="flex gap-4">
        <Button variant="quiet-ink" className="px-0 text-sm" onClick={onEdit}>{carnetCopy.notesEdit}</Button>
        <Button variant="quiet" className="px-0 text-sm" onClick={onAskDelete}>{carnetCopy.notesDelete}</Button>
      </div>
    </article>
  );
}

function CarnetWeaknessRow({
  weakness,
  now,
}: {
  weakness: Weakness;
  now: () => Date;
}) {
  const quiet = weakness.trend === "tranquille";
  // prettier-ignore
  return (
    <article id={`weakness-${weakness.category}`} className="border-line flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t py-4">
      <div className="flex min-w-0 flex-1 basis-[380px] flex-col gap-1">
        <h3 lang="fr" className={`m-0 font-serif text-[22px] font-medium ${quiet ? "text-ink-2" : ""}`}>{weakness.label}</h3>
        <p lang="fr" className={`m-0 text-[15px] ${quiet ? "text-muted" : "text-ink-2"}`}>{formatWeaknessMeta(weakness, now)}</p>
      </div>
    </article>
  );
}
