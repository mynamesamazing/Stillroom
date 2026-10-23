"use client";

import React, { useState } from "react";
import { CalendarEntry, ContentItem, DayPortrait, Mood, Space, createId } from "@/lib/models";
import { addDays, dateLabel, entryOccursOnDate, localDateKey, monthDates, parseLocalDate } from "@/lib/dates";
import { MediaAttachments } from "./MediaAttachments";
import { HabitTracker } from "./HabitTracker";

const moods: Mood[] = ["Lovely", "Good", "So-so", "Heavy", "Quiet"];

export function CalendarWorkspace({ entries, portraits, tasks, spaces, selectedDate, onSelectDate, onSaveEntry, onDeleteEntry, onSavePortrait, onDeletePortrait, onAddTask, onOpenItem }: {
  entries: CalendarEntry[];
  portraits: DayPortrait[];
  tasks: ContentItem[];
  spaces: Space[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onSaveEntry: (entry: CalendarEntry) => Promise<boolean>;
  onDeleteEntry: (id: string) => Promise<boolean>;
  onSavePortrait: (portrait: DayPortrait) => Promise<boolean>;
  onDeletePortrait: (date: string) => Promise<boolean>;
  onAddTask: (date: string) => void;
  onOpenItem: (item: ContentItem) => void;
}) {
  const [mode, setMode] = useState<"week" | "month">("month");
  const [editing, setEditing] = useState<CalendarEntry | "journal" | "event" | "occasion" | "memory" | null>(null);
  const [editingPortrait, setEditingPortrait] = useState(false);
  const [habitCreateSignal, setHabitCreateSignal] = useState(0);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [month, setMonth] = useState(() => parseLocalDate(selectedDate));
  const day = parseLocalDate(selectedDate);
  const dates = mode === "month" ? monthDates(month) : Array.from({ length: 7 }, (_, index) => addDays(day, index - ((day.getDay() + 6) % 7)));
  const dateEntries = entries.filter(entry => entryOccursOnDate(entry, day)).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const dateTasks = tasks.filter(item => item.type === "task" && item.dueDate === selectedDate);
  const portrait = portraits.find(item => item.date === selectedDate);

  const saveEntry = async (entry: CalendarEntry) => { if (await onSaveEntry(entry)) setEditing(null); };
  const openAdd = (type: "journal" | "event" | "occasion" | "memory" | "task" | "habit") => {
    setAddMenuOpen(false);
    if (type === "task") onAddTask(selectedDate);
    else if (type === "habit") setHabitCreateSignal(value => value + 1);
    else setEditing(type);
  };

  return <div className="space-y-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><button type="button" aria-label="Previous period" onClick={() => mode === "month" ? setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12)) : onSelectDate(localDateKey(addDays(day, -7)))} className="grid h-11 w-11 place-items-center rounded-md border line-border">‹</button><h2 className="min-w-40 text-center font-editorial text-2xl">{dateLabel(mode === "week" ? day : month, { month: "long", year: "numeric" })}</h2><button type="button" aria-label="Next period" onClick={() => mode === "month" ? setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12)) : onSelectDate(localDateKey(addDays(day, 7)))} className="grid h-11 w-11 place-items-center rounded-md border line-border">›</button></div>
      <div className="flex gap-1 rounded-md border line-border p-1" aria-label="Calendar view">{(["week", "month"] as const).map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-9 rounded px-3 text-sm capitalize ${mode === value ? "surface" : ""}`}>{value}</button>)}</div>
    </div>
    <section aria-label={`${mode} view`} className="rounded-md border line-border surface p-2 sm:p-4">
      <div className="grid grid-cols-7 gap-1">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(label => <div key={label} className="py-2 text-center text-xs text-stone-500">{label}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">{dates.map(date => {
        const key = localDateKey(date);
        const isCurrentMonth = date.getMonth() === month.getMonth();
        const hasEvent = entries.some(entry => entryOccursOnDate(entry, date)) || tasks.some(task => task.type === "task" && task.dueDate === key);
        return <button key={key} type="button" onClick={() => { onSelectDate(key); setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12)); }} aria-pressed={key === selectedDate} aria-label={`${dateLabel(date)}${hasEvent ? ", has items" : ""}`} className={`grid min-h-12 place-items-center rounded-md p-1 text-sm sm:min-h-16 ${key === selectedDate ? "bg-stone-200 dark:bg-stone-700" : ""} ${!isCurrentMonth && mode === "month" ? "opacity-40" : ""}`}>
          <span>{date.getDate()}</span>{hasEvent && <i aria-hidden="true" className="mt-0.5 h-1.5 w-1.5 rounded-full bg-stone-500"/>}
        </button>;
      })}</div>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b line-border pb-4"><div><h2 className="font-editorial text-3xl">{dateLabel(day)}</h2><p className="text-sm text-stone-500">The days and moments that fill those rooms.</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1"><button type="button" onClick={() => setEditingPortrait(true)} className="min-h-11 text-sm underline underline-offset-4">Add Mood</button><button type="button" onClick={() => setEditingPortrait(true)} className="min-h-11 text-sm underline underline-offset-4">Add Photo</button><button type="button" onClick={() => openAdd("memory")} className="min-h-11 text-sm underline underline-offset-4">Add Memory</button></div></div><div className="relative"><button type="button" aria-expanded={addMenuOpen} onClick={() => setAddMenuOpen(value => !value)} className="min-h-11 rounded-md bg-stone-800 px-4 text-sm text-white dark:bg-stone-100 dark:text-stone-900">+ Add to this day</button>{addMenuOpen && <div className="absolute right-0 z-10 mt-2 w-60 rounded-md border line-border surface p-1 shadow-lg">{[["journal", "Journal entry"], ["event", "Appointment or event"], ["occasion", "Birthday or anniversary"], ["memory", "Little memory or milestone"], ["task", "Task"], ["habit", "Habit"]].map(([type, label]) => <button key={type} type="button" onClick={() => openAdd(type as "journal" | "event" | "occasion" | "memory" | "task" | "habit")} className="block min-h-11 w-full rounded px-3 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700">{label}</button>)}</div>}</div></div>
    {editing && <EntryEditor entry={typeof editing === "object" ? editing : null} type={typeof editing === "object" ? editing.type : editing} date={selectedDate} spaces={spaces} portrait={portrait} onCancel={() => setEditing(null)} onSave={saveEntry} onDelete={async entry => { if (await onDeleteEntry(entry.id)) setEditing(null); }}/>}
    <section className="space-y-3" aria-label="Items for selected date">
      {dateTasks.map(task => <article key={task.id} className="flex items-center justify-between gap-3 rounded-md border line-border surface p-3"><button type="button" onClick={() => onOpenItem(task)} className="min-h-11 min-w-0 flex-1 truncate text-left">{task.title}</button><span className="text-xs text-stone-500">Task</span></article>)}
      {dateEntries.map(entry => <article key={entry.id} className="rounded-md border line-border surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs capitalize text-stone-500">{entry.type}{entry.yearly ? " · yearly" : ""}{entry.time ? ` · ${entry.time}` : ""}</p><h3 className="font-editorial text-2xl">{entry.title || entry.body || "A little memory"}</h3>{entry.location && <p className="text-sm text-stone-500">{entry.location}</p>}{entry.body && entry.title && <p className="mt-2 whitespace-pre-wrap text-sm text-stone-500">{entry.body}</p>}</div><div className="flex gap-2"><button type="button" onClick={() => setEditing(entry)} className="min-h-11 px-2 text-sm underline">Edit</button><button type="button" onClick={async () => { await onDeleteEntry(entry.id); }} className="min-h-11 px-2 text-sm text-red-700 underline">Delete</button></div></div>{entry.mood && <p className="mt-2 text-sm">{entry.mood}</p>}{entry.photoIds?.length ? <MediaAttachments photoIds={entry.photoIds} onChange={ids => { void onSaveEntry({ ...entry, photoIds: ids, updatedAt: new Date().toISOString() }); }}/> : null}</article>)}
      {!dateTasks.length && !dateEntries.length && <p className="rounded-md border border-dashed line-border p-5 text-sm text-stone-500">A little room for what this day holds.</p>}
    </section>
    <section className="rounded-md border line-border surface p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-editorial text-2xl">Remember this day</h2><p className="text-sm text-stone-500">A portrait can be just a mood, words, photos, or any combination.</p></div><button type="button" onClick={() => setEditingPortrait(value => !value)} className="min-h-11 rounded-md border line-border px-3 text-sm">{editingPortrait ? "Close" : portrait ? "Edit portrait" : "Add portrait"}</button></div>
      {portrait && !editingPortrait && <div className="mt-3 space-y-2">{portrait.mood && <p>{portrait.mood}</p>}{portrait.caption && <p className="whitespace-pre-wrap text-sm">{portrait.caption}</p>}{portrait.photoIds.length > 0 && <MediaAttachments photoIds={portrait.photoIds} onChange={ids => { void onSavePortrait({ ...portrait, photoIds: ids, updatedAt: new Date().toISOString() }); }}/>}</div>}
      {editingPortrait && <PortraitEditor date={selectedDate} value={portrait} onCancel={() => setEditingPortrait(false)} onSave={async value => { if (await onSavePortrait(value)) setEditingPortrait(false); }} onDelete={async () => { if (await onDeletePortrait(selectedDate)) setEditingPortrait(false); }}/>}
    </section>
    <HabitTracker key={habitCreateSignal} spaces={spaces.map(space => ({ id: space.id, name: space.name, accent: space.accent }))} initialDate={selectedDate} selectedDate={selectedDate} onSelectedDateChange={onSelectDate} createTrigger={habitCreateSignal}/>
  </div>;
}

function EntryEditor({ entry, type, date, spaces, portrait, onCancel, onSave, onDelete }: {
  entry: CalendarEntry | null; type: CalendarEntry["type"]; date: string; spaces: Space[]; portrait?: DayPortrait;
  onCancel: () => void; onSave: (entry: CalendarEntry) => void | Promise<void>; onDelete: (entry: CalendarEntry) => void;
}) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [time, setTime] = useState(entry?.time ?? "");
  const [location, setLocation] = useState(entry?.location ?? "");
  const [mood, setMood] = useState<Mood | "">(entry?.mood ?? "");
  const [photoIds, setPhotoIds] = useState(entry?.photoIds ?? []);
  const [spaceId, setSpaceId] = useState(entry?.spaceId ?? "");
  const [yearly, setYearly] = useState(entry?.yearly ?? type === "occasion");
  const [reminderDays, setReminderDays] = useState(String(entry?.reminderDays ?? 0));
  const [referencePortrait, setReferencePortrait] = useState(Boolean(entry?.portraitId ?? portrait));
  const update = () => onSave({ id: entry?.id ?? createId(), type, date: entry?.date ?? date, title: title.trim() || undefined, body: body.trim() || undefined, time: time || undefined, location: location.trim() || undefined, mood: mood || undefined, photoIds, portraitId: type === "journal" && referencePortrait ? portrait?.id : undefined, spaceId: spaceId || undefined, yearly: type === "occasion" ? yearly : undefined, reminderDays: type === "occasion" && Number(reminderDays) > 0 ? Number(reminderDays) : undefined, createdAt: entry?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() });
  return <form onSubmit={event => { event.preventDefault(); update(); }} className="rounded-md border line-border surface p-4" aria-label={`${entry ? "Edit" : "Add"} ${type}`}>
    <h3 className="mb-4 font-editorial text-2xl">{entry ? "Edit" : "Add"} {type === "journal" ? "journal entry" : type === "occasion" ? "birthday or anniversary" : type === "event" ? "appointment or event" : "memory or milestone"}</h3>
    <label className="mb-3 block text-sm">Title (optional)<input autoFocus value={title} onChange={event => setTitle(event.target.value)} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3 text-base"/></label>
    {type === "event" && <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Time (optional)<input type="time" value={time} onChange={event => setTime(event.target.value)} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3"/></label><label className="text-sm">Location (optional)<input value={location} onChange={event => setLocation(event.target.value)} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3 text-base"/></label></div>}
    {(type === "journal" || type === "memory" || type === "event") && <label className="mt-3 block text-sm">Notes or caption<textarea value={body} onChange={event => setBody(event.target.value)} rows={4} className="mt-1 w-full rounded-md border line-border bg-transparent p-3 text-base"/></label>}
    {type === "journal" && <fieldset className="mt-3"><legend className="text-sm">Mood (optional)</legend><MoodPicker value={mood} onChange={setMood}/></fieldset>}
    {type === "journal" && portrait && <label className="mt-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={referencePortrait} onChange={event => setReferencePortrait(event.target.checked)}/> Reference this day&apos;s portrait</label>}
    {type === "occasion" && <div className="mt-3 space-y-3"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={yearly} onChange={event => setYearly(event.target.checked)}/> Repeat every year</label><label className="block text-sm">Advance reminder (days, optional)<input type="number" min="0" max="365" value={reminderDays} onChange={event => setReminderDays(event.target.value)} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3"/></label></div>}
    {(type === "journal" || type === "memory") && <div className="mt-3"><MediaAttachments photoIds={photoIds} onChange={setPhotoIds}/></div>}
    {spaces.length > 0 && <label className="mt-3 block text-sm">Space (optional)<select value={spaceId} onChange={event => setSpaceId(event.target.value)} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3"><option value="">Personal</option>{spaces.map(space => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label>}
    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t line-border pt-3"><button type="button" onClick={onCancel} className="min-h-11 rounded-md border line-border px-4">Cancel</button>{entry && <button type="button" onClick={() => onDelete(entry)} className="min-h-11 px-3 text-red-700">Delete</button>}<button type="submit" className="min-h-11 rounded-md bg-stone-800 px-4 text-sm text-white dark:bg-stone-100 dark:text-stone-900">Save</button></div>
  </form>;
}

function PortraitEditor({ date, value, onCancel, onSave, onDelete }: { date: string; value?: DayPortrait; onCancel: () => void; onSave: (portrait: DayPortrait) => void | Promise<void>; onDelete: () => void | Promise<void> }) {
  const [mood, setMood] = useState<Mood | "">(value?.mood ?? "");
  const [caption, setCaption] = useState(value?.caption ?? "");
  const [photoIds, setPhotoIds] = useState(value?.photoIds ?? []);
  return <form onSubmit={event => { event.preventDefault(); onSave({ id: value?.id ?? crypto.randomUUID(), date, mood: mood || undefined, caption: caption.trim() || undefined, photoIds, updatedAt: new Date().toISOString() }); }} className="mt-4 space-y-3">
    <fieldset><legend className="text-sm">How did it feel?</legend><MoodPicker value={mood} onChange={setMood}/></fieldset>
    <label className="block text-sm">Caption (optional)<textarea value={caption} onChange={event => setCaption(event.target.value)} rows={3} className="mt-1 w-full rounded-md border line-border bg-transparent p-3 text-base"/></label>
    <MediaAttachments photoIds={photoIds} onChange={setPhotoIds}/>
    <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={onCancel} className="min-h-11 rounded-md border line-border px-4">Cancel</button>{value && <button type="button" onClick={onDelete} className="min-h-11 px-3 text-red-700">Delete portrait</button>}<button type="submit" className="min-h-11 rounded-md bg-stone-800 px-4 text-sm text-white dark:bg-stone-100 dark:text-stone-900">Save portrait</button></div>
  </form>;
}

function MoodPicker({ value, onChange }: { value: Mood | ""; onChange: (mood: Mood | "") => void }) {
  return <div className="mt-2 flex flex-wrap gap-2">{moods.map(mood => <button key={mood} type="button" aria-pressed={value === mood} onClick={() => onChange(value === mood ? "" : mood)} className={`min-h-11 rounded-full border px-3 text-sm ${value === mood ? "border-stone-500 bg-stone-200 dark:bg-stone-700" : "line-border"}`}>{mood}</button>)}</div>;
}
