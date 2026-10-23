"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { photoStore } from "@/lib/photoStore";

export function MediaAttachments({ photoIds, onChange }: { photoIds: string[]; onChange: (ids: string[]) => void }) {
  const [sources, setSources] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    Promise.all(photoIds.map(async id => {
      const photo = await photoStore.get(id);
      return photo ? [id, URL.createObjectURL(photo.blob)] as const : null;
    })).then(values => {
      if (!active) { values.forEach(value => value && URL.revokeObjectURL(value[1])); return; }
      values.forEach(value => value && urls.push(value[1]));
      setSources(Object.fromEntries(values.filter((value): value is readonly [string, string] => value !== null)));
    }).catch(() => setError("A saved local photo could not be opened."));
    return () => { active = false; if (typeof URL.revokeObjectURL === "function") urls.forEach(URL.revokeObjectURL); };
  }, [photoIds]);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    const additions: string[] = [];
    try {
      for (const file of Array.from(files)) {
        additions.push(await photoStore.add(file));
        onChange([...photoIds, ...additions]);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A photo could not be saved. Your entry is unchanged.");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return <div className="space-y-2">
    <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" aria-label="Add photos" onChange={event => void addFiles(event.target.files)}/>
    <button type="button" onClick={() => inputRef.current?.click()} className="min-h-11 rounded-md border line-border px-3 text-sm">Add Photo</button>
    <div className="flex flex-wrap gap-2">{photoIds.map(id => <figure key={id} className="relative">
      {sources[id] ? <Image src={sources[id]} alt="Attached memory" width={80} height={80} unoptimized className="h-20 w-20 rounded-md object-cover"/> : <span className="grid h-20 w-20 place-items-center rounded-md border line-border text-xs">Photo</span>}
      <button type="button" aria-label="Remove photo attachment" onClick={() => onChange(photoIds.filter(photoId => photoId !== id))} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border line-border surface">×</button>
    </figure>)}</div>
    <p className="text-xs text-stone-500">Photos stay in this browser only; they are not synced or backed up.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
