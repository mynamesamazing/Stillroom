"use client";

import React, { useRef, useState } from "react";
import { CaptureEntry, Space } from "@/lib/models";

export function CaptureWorkspace({ entries, spaces, onSave, onEdit, onDelete, onConvert }: {
  entries: CaptureEntry[];
  spaces: Space[];
  onSave: (text: string) => Promise<boolean>;
  onEdit: (entry: CaptureEntry) => Promise<boolean>;
  onDelete: (id: string) => void;
  onConvert: (entry: CaptureEntry, type: "task" | "note", spaceId: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [spaceById, setSpaceById] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setStatus("");
    if (await onSave(text.trim())) {
      setText("");
      setStatus("Saved");
      inputRef.current?.focus();
    } else setStatus("Not saved. Your text is still here; try again.");
  };

  return <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-5 md:px-8">
    <header className="mb-7 border-b line-border pb-5"><p className="mb-2 text-xs uppercase tracking-[0.22em] text-stone-500">Capture</p><h1 className="font-editorial text-4xl sm:text-5xl">The Catchall</h1><p className="mt-2 text-sm leading-6 text-stone-500">That little drawer where you put something because you know you&apos;ll need it later.</p></header>
    <form onSubmit={save} className="rounded-md border line-border surface p-4 sm:p-5">
      <label htmlFor="capture-input" className="mb-2 block text-sm">A thought, a reminder, anything to come back to</label>
      <textarea ref={inputRef} id="capture-input" autoFocus value={text} onChange={event => setText(event.target.value)} rows={4} placeholder="Let it land here for now…" className="w-full resize-y rounded-md border line-border bg-transparent p-3 text-base"/>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p role="status" aria-live="polite" className="text-sm text-stone-500">{status}</p><button type="submit" disabled={!text.trim()} className="min-h-11 rounded-md bg-stone-800 px-5 text-sm text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900">Save for later</button></div>
    </form>
    <div className="mt-8 space-y-3">{entries.length === 0 && <p className="rounded-md border border-dashed line-border p-6 text-center text-sm text-stone-500">Your Catchall is clear. Add something whenever you like.</p>}
      {entries.map(entry => <article key={entry.id} className="rounded-md border line-border surface p-4">
        {editingId === entry.id ? <form onSubmit={async event => { event.preventDefault(); if (await onEdit({ ...entry, text: editingText.trim(), updatedAt: new Date().toISOString() })) setEditingId(null); }}><label className="sr-only" htmlFor={`capture-edit-${entry.id}`}>Edit saved thought</label><textarea id={`capture-edit-${entry.id}`} autoFocus value={editingText} onChange={event => setEditingText(event.target.value)} rows={3} className="w-full rounded-md border line-border bg-transparent p-3 text-base"/><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setEditingId(null)} className="min-h-11 px-3">Cancel</button><button type="submit" disabled={!editingText.trim()} className="min-h-11 rounded-md border line-border px-3 disabled:opacity-50">Save</button></div></form> : <p className="whitespace-pre-wrap break-words text-sm leading-6">{entry.text}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t line-border pt-3">
          <button type="button" onClick={() => { setEditingText(entry.text); setEditingId(entry.id); }} className="min-h-11 px-2 text-sm underline">Edit</button>
          <label className="sr-only" htmlFor={`capture-space-${entry.id}`}>Choose a Space to convert this thought into</label>
          <select id={`capture-space-${entry.id}`} value={spaceById[entry.id] ?? spaces[0]?.id ?? ""} onChange={event => setSpaceById(current => ({ ...current, [entry.id]: event.target.value }))} className="min-h-11 min-w-0 flex-1 rounded-md border line-border bg-transparent px-2 text-sm"><option value="">Choose a Space</option>{spaces.map(space => <option key={space.id} value={space.id}>{space.name}</option>)}</select>
          <button type="button" disabled={!spaceById[entry.id] && !spaces[0]} onClick={async () => { const target = spaceById[entry.id] ?? spaces[0]?.id; if (target) await onConvert(entry, "task", target); }} className="min-h-11 rounded-md border line-border px-2 text-xs disabled:opacity-40">Make task</button>
          <button type="button" disabled={!spaceById[entry.id] && !spaces[0]} onClick={async () => { const target = spaceById[entry.id] ?? spaces[0]?.id; if (target) await onConvert(entry, "note", target); }} className="min-h-11 rounded-md border line-border px-2 text-xs disabled:opacity-40">Save as note in Space</button>
          <button type="button" onClick={() => onDelete(entry.id)} className="min-h-11 px-2 text-sm text-red-700 underline">Delete</button>
        </div>
      </article>)}
    </div>
    <p className="mt-5 text-xs text-stone-500">Your Catchall lives in this browser only. It is not synced between devices.</p>
  </section>;
}
