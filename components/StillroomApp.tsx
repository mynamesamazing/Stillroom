"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Archive, ArrowDown, ArrowUp, BookOpen, Briefcase, Check, ChevronDown, Heart, Home, Leaf, Moon, Palette, Pin, PinOff, Plus, Search, Sun, Trash2, X } from "lucide-react";
import { AppData, CalendarEntry, CaptureEntry, ContentItem, DayPortrait, ItemType, ListEntry, Space, SpaceIcon, Tag, createId, now } from "@/lib/models";
import { repository, seedData } from "@/lib/repositories/localRepository";
import { HabitTracker } from "@/components/HabitTracker";
import { normalizeTagName, normalizeTagRegistry, suggestedTags } from "@/lib/tags";
import { HomeDashboard } from "@/components/HomeDashboard";
import { CalendarWorkspace } from "@/components/CalendarWorkspace";
import { CaptureWorkspace } from "@/components/CaptureWorkspace";
import { localDateKey } from "@/lib/dates";

const icons = { home: Home, book: BookOpen, palette: Palette, heart: Heart, briefcase: Briefcase, leaf: Leaf };
const accents = ["#9B6849", "#5F7257", "#A76A76", "#62758C", "#A27B43", "#77705E"];
const itemLabels: Record<ItemType, string> = { task: "Task", note: "Note", list: "List", link: "Link" };
export const itemTypeTab = (type: ItemType): ItemType => type;
export const shouldShowOnboarding = (isNewWorkspace: boolean, hasStorageWarning: boolean) => isNewWorkspace && !hasStorageWarning;

export function StillroomApp() {
  const [data, setData] = useState<AppData>(seedData);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"library" | "space" | "home" | "calendar" | "capture">("home");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [spaceEditor, setSpaceEditor] = useState<Space | "new" | null>(null);
  const [itemEditor, setItemEditor] = useState<ContentItem | null>(null);
  const [newItemType, setNewItemType] = useState<ItemType | null>(null);
  const [dark, setDark] = useState(false);
  const [createdTab, setCreatedTab] = useState<ItemType | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [storageWritesBlocked, setStorageWritesBlocked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => localDateKey(new Date()));
  const [newItemDate, setNewItemDate] = useState<string | undefined>();

  useEffect(() => { repository.load().then(result => { setData(result.data); setStorageWarning(result.warning?.message ?? null); setStorageWritesBlocked(result.warning?.code === "invalid-json" || result.warning?.code === "malformed-data" || result.warning?.code === "read-error"); setShowOnboarding(result.isNewWorkspace); setLoaded(true); }).catch(error => { setStorageWarning(error instanceof Error ? error.message : "Stillroom could not access browser storage."); setStorageWritesBlocked(true); setLoaded(true); }); }, []);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  const spaces = useMemo(() => [...data.spaces].sort((a, b) => a.sortOrder - b.sortOrder).filter(s => s.archived === showArchived && s.name.toLowerCase().includes(search.toLowerCase())), [data.spaces, showArchived, search]);
  const activeSpace = data.spaces.find(s => s.id === activeId);

  const persistSpace = async (space: Space) => {
    if (storageWritesBlocked) { setStorageWarning("Stillroom preserved existing unreadable data. Resolve the recovery warning before saving changes."); return; }
    try {
      const exists = data.spaces.some(s => s.id === space.id);
      const saved = exists ? await repository.updateSpace(space) : await repository.createSpace(space);
      const next = { ...data, spaces: exists ? data.spaces.map(s => s.id === saved.id ? saved : s) : [...data.spaces, saved] };
      await repository.save(next);
      setData(next);
      setStorageWarning(null);
      setSpaceEditor(null);
    } catch (error) { setStorageWarning(error instanceof Error ? error.message : "Stillroom could not save this Space."); }
  };
  const persistData = async (next: AppData, failureMessage: string) => {
    if (storageWritesBlocked) { setStorageWarning("Stillroom preserved existing unreadable data. Resolve the recovery warning before saving changes."); return false; }
    try { await repository.save(next); setData(next); setStorageWarning(null); return true; }
    catch (error) { setStorageWarning(error instanceof Error ? error.message : failureMessage); return false; }
  };
  const reorder = async (id: string, direction: -1 | 1) => {
    const activeSpaces = data.spaces.filter(s => !s.archived).sort((a, b) => a.sortOrder - b.sortOrder);
    const index = activeSpaces.findIndex(s => s.id === id);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= activeSpaces.length) return;
    [activeSpaces[index], activeSpaces[nextIndex]] = [activeSpaces[nextIndex], activeSpaces[index]];
    const next = { ...data, spaces: data.spaces.map(s => { const order = activeSpaces.findIndex(a => a.id === s.id); return order >= 0 ? { ...s, sortOrder: order } : s; }) };
    await persistData(next, "Stillroom could not save Space order.");
  };
  const archiveSpace = async (id: string, archived: boolean) => {
    const next = { ...data, spaces: data.spaces.map(s => s.id === id ? { ...s, archived } : s) };
    await persistData(next, `Stillroom could not ${archived ? "archive" : "restore"} this Space.`);
  };
  const saveItem = async (item: ContentItem, itemTags: Tag[] = []) => {
    if (storageWritesBlocked) { setStorageWarning("Stillroom preserved existing unreadable data. Resolve the recovery warning before saving changes."); return; }
    try {
      const exists = data.items.some(i => i.id === item.id);
      const saved = exists ? await repository.updateItem(item) : await repository.createItem(item);
      const next = { ...data, items: exists ? data.items.map(i => i.id === saved.id ? saved : i) : [...data.items, saved], tags: normalizeTagRegistry([...(data.tags ?? []), ...itemTags]).tags };
      await repository.save(next);
      setData(next);
      setStorageWarning(null);
      if (!exists && view === "space") setCreatedTab(saved.type);
      setItemEditor(null); setNewItemType(null); setNewItemDate(undefined);
    } catch (error) { setStorageWarning(error instanceof Error ? error.message : "Stillroom could not save this item."); }
  };
  const deleteItem = async (id: string) => {
    if (storageWritesBlocked) { setStorageWarning("Stillroom preserved existing unreadable data. Resolve the recovery warning before saving changes."); return; }
    try {
      await repository.deleteItem(id);
      const next = { ...data, items: data.items.filter(i => i.id !== id) };
      await repository.save(next);
      setData(next); setStorageWarning(null); setItemEditor(null);
    } catch (error) { setStorageWarning(error instanceof Error ? error.message : "Stillroom could not delete this item."); }
  };
  const saveCalendarEntry = (entry: CalendarEntry) => {
    const records = data.calendarEntries ?? [];
    const next = { ...data, calendarEntries: records.some(value => value.id === entry.id) ? records.map(value => value.id === entry.id ? entry : value) : [...records, entry] };
    return persistData(next, "Stillroom could not save this calendar entry.");
  };
  const deleteCalendarEntry = (id: string) => {
    return persistData({ ...data, calendarEntries: (data.calendarEntries ?? []).filter(entry => entry.id !== id) }, "Stillroom could not delete this calendar entry.");
  };
  const savePortrait = (portrait: DayPortrait) => {
    const records = data.dayPortraits ?? [];
    return persistData({ ...data, dayPortraits: records.some(value => value.date === portrait.date) ? records.map(value => value.date === portrait.date ? portrait : value) : [...records, portrait] }, "Stillroom could not save this day portrait.");
  };
  const deletePortrait = (date: string) => {
    return persistData({ ...data, dayPortraits: (data.dayPortraits ?? []).filter(portrait => portrait.date !== date) }, "Stillroom could not delete this day portrait.");
  };
  const saveCapture = async (text: string) => {
    const timestamp = now();
    const entry: CaptureEntry = { id: createId(), text, createdAt: timestamp, updatedAt: timestamp };
    return persistData({ ...data, captureEntries: [...(data.captureEntries ?? []), entry] }, "Stillroom could not save this thought.");
  };
  const editCapture = (entry: CaptureEntry) => persistData({ ...data, captureEntries: (data.captureEntries ?? []).map(value => value.id === entry.id ? entry : value) }, "Stillroom could not update this thought.");
  const deleteCapture = (id: string) => { void persistData({ ...data, captureEntries: (data.captureEntries ?? []).filter(entry => entry.id !== id) }, "Stillroom could not delete this thought."); };
  const convertCapture = async (entry: CaptureEntry, type: "task" | "note", spaceId: string) => {
    const timestamp = now();
    const base = { id: createId(), ownerId: null, spaceId, title: entry.text.trim().split("\n")[0].slice(0, 64) || "From The Catchall", pinned: false, createdAt: timestamp, updatedAt: timestamp };
    const item: ContentItem = type === "task" ? { ...base, type, description: entry.text, completed: false, priority: "medium" } : { ...base, type, body: entry.text };
    return persistData({ ...data, items: [...data.items, item] }, "Stillroom could not move this thought into your Space.");
  };
  const openTaskEditor = (date?: string) => { setNewItemDate(date); setNewItemType("task"); setItemEditor(null); };

  const openSpace = (id: string) => { setActiveId(id); setView("space"); };
  const exploreSamples = async () => {
    if (storageWritesBlocked) { setStorageWarning("Stillroom preserved existing unreadable data. Resolve the recovery warning before loading samples."); return; }
    try {
      const samples = structuredClone(seedData);
      await repository.save(samples);
      setData(samples);
      setStorageWarning(null);
      setShowOnboarding(false);
    } catch (error) { setStorageWarning(error instanceof Error ? error.message : "Stillroom could not create the sample Spaces."); }
  };
  const createFirstSpace = () => {
    setShowOnboarding(false);
    setSpaceEditor("new");
  };
  if (!loaded) return <div className="grid min-h-screen place-items-center text-sm text-stone-500">Opening Stillroom...</div>;

  return <main className="min-h-screen">
    {storageWarning && <div role="status" className="border-b border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100 sm:px-5"><div className="mx-auto flex max-w-6xl items-start justify-between gap-4"><span className="min-w-0 flex-1 break-words">{storageWarning}</span><button type="button" onClick={() => setStorageWarning(null)} aria-label="Dismiss storage warning" className="shrink-0 underline underline-offset-4">Dismiss</button></div></div>}
    <header className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-5 sm:py-5 sm:pt-[calc(1.25rem+env(safe-area-inset-top))] md:px-8 md:py-5">
      <span aria-hidden="true"/>
      <button onClick={() => setView("home")} className="text-center"><span className="block font-editorial text-3xl font-semibold tracking-wide">Stillroom</span><span className="block text-[0.65rem] tracking-wide text-stone-500">A home for all your little worlds.</span></button>
      <button onClick={() => setDark(v => !v)} className="grid h-9 w-9 place-items-center rounded-full border line-border" aria-label={`Use ${dark ? "day" : "night"} theme`}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
    </header>
    {!showOnboarding && <nav aria-label="Main navigation" className="mx-auto mb-7 flex max-w-6xl gap-2 overflow-x-auto px-4 sm:px-5 md:px-8">{(["home","library","calendar","capture"] as const).map(tab=><button key={tab} type="button" onClick={()=>setView(tab)} aria-current={view===tab || (tab === "library" && view === "space") ? "page" : undefined} className={"min-h-11 shrink-0 rounded-md border px-4 py-2 text-sm "+(view===tab || (tab === "library" && view === "space")?"border-stone-500 surface":"line-border")}>{tab==="library"?"Spaces":tab==="home"?"Home":tab==="calendar"?"Calendar":"Capture"}</button>)}</nav>}
    {showOnboarding ? <section className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-xl items-center px-4 py-10 text-center sm:px-8"><div className="w-full"><p className="mb-4 text-xs uppercase tracking-[0.22em] onboarding-muted">Stillroom beta</p><h1 className="font-editorial text-4xl font-medium leading-tight sm:text-5xl md:text-6xl">Make yourself at home.</h1><p className="mx-auto mt-5 max-w-md text-base leading-7 onboarding-muted">A little room for everything on your mind.</p><div className="mx-auto mt-8 flex max-w-sm flex-col gap-3"><button type="button" onClick={createFirstSpace} className="min-h-12 w-full rounded-md onboarding-primary px-5 py-3 text-sm">Create your first Space</button><button type="button" onClick={exploreSamples} className="min-h-12 w-full rounded-md border line-border surface px-5 py-3 text-sm">Explore with sample Spaces</button></div><p className="mx-auto mt-7 max-w-lg text-xs leading-5 onboarding-muted">This beta stores data only in this browser. It does not sync across devices, and clearing browser data can erase your content. Please avoid storing sensitive information.</p></div></section>
      : view === "home" ? <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 md:px-8"><div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b line-border pb-5"><div><h1 className="font-editorial text-4xl sm:text-5xl">Home</h1><p className="mt-2 text-sm text-stone-500">Your welcoming starting point. A glimpse of everything happening in your world.</p></div><a href="#close-at-hand" className="min-h-11 rounded-md border line-border px-3 py-2 text-sm">Close at Hand</a></div><HomeDashboard data={data} spaces={data.spaces} selectedDate={calendarDate} onSelectDate={setCalendarDate} onOpenCalendar={() => setView("calendar")} onOpenItem={setItemEditor} onOpenSpace={openSpace} onSaveCalendarEntry={saveCalendarEntry}><HabitTracker spaces={data.spaces.filter(s=>!s.archived).map(s=>({id:s.id,name:s.name,accent:s.accent}))} compact/></HomeDashboard></section>
      : view === "calendar" ? <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 md:px-8"><div className="mb-7 border-b line-border pb-5"><h1 className="font-editorial text-4xl sm:text-5xl">Calendar</h1><p className="mt-2 text-sm text-stone-500">The days and moments that fill those rooms.</p></div><CalendarWorkspace entries={data.calendarEntries ?? []} portraits={data.dayPortraits ?? []} tasks={data.items} spaces={data.spaces.filter(s=>!s.archived)} selectedDate={calendarDate} onSelectDate={setCalendarDate} onSaveEntry={saveCalendarEntry} onDeleteEntry={deleteCalendarEntry} onSavePortrait={savePortrait} onDeletePortrait={deletePortrait} onAddTask={openTaskEditor} onOpenItem={setItemEditor}/></section>
      : view === "capture" ? <CaptureWorkspace entries={data.captureEntries ?? []} spaces={data.spaces.filter(s=>!s.archived)} onSave={saveCapture} onEdit={editCapture} onDelete={deleteCapture} onConvert={convertCapture}/>
      : view === "library" ? <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 md:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-4 gap-y-5 border-b line-border pb-7">
        <div className="min-w-0"><p className="mb-2 text-xs uppercase tracking-[0.22em] text-stone-500">Your places</p><h1 className="font-editorial text-4xl font-medium sm:text-5xl md:text-6xl">Spaces</h1><p className="mt-2 max-w-2xl text-sm text-stone-500">The individual rooms of your life, each with its own purpose and personality.</p></div>
        <button onClick={() => setSpaceEditor("new") } className="flex h-11 shrink-0 items-center gap-2 rounded-md bg-stone-800 px-3 text-sm text-white dark:bg-stone-100 dark:text-stone-900 sm:px-4"><Plus size={17}/> Create Space</button>
      </div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3 text-stone-400" size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Spaces" className="h-11 w-full rounded-md border line-border bg-transparent pl-10 pr-3" /></div>
        <button onClick={() => setShowArchived(v => !v)} className="text-sm underline decoration-stone-400 underline-offset-4">{showArchived ? "View active Spaces" : "View archived Spaces"}</button>
      </div>
      {spaces.length ? <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">{spaces.map((space, index) => <SpaceCard key={space.id} space={space} index={index} lastIndex={spaces.length - 1} showArchived={showArchived} onOpen={() => openSpace(space.id)} onReorder={direction => reorder(space.id, direction)} onEdit={() => setSpaceEditor(space)} onArchive={() => archiveSpace(space.id, !space.archived)}/>)}</div> : <Empty title={showArchived ? "No archived Spaces" : "No Spaces found"} text={showArchived ? "Archived Spaces will rest here." : "Create a Space to begin organizing your life."} action={!showArchived ? () => setSpaceEditor("new") : undefined}/>}
    </section> : activeSpace ? <SpaceView space={activeSpace} data={data} onBack={() => setView("library") } onEdit={() => setSpaceEditor(activeSpace)} createdTab={createdTab} onCreatedTabShown={() => setCreatedTab(null)} onAdd={setNewItemType} onEditItem={setItemEditor} onMove={(item, spaceId) => saveItem({ ...item, spaceId })} onTogglePin={item => saveItem({ ...item, pinned: !item.pinned })} onToggleTask={item => item.type === "task" && saveItem({ ...item, completed: !item.completed })} /> : null}
    {spaceEditor && <SpaceEditor value={spaceEditor === "new" ? null : spaceEditor} nextOrder={data.spaces.length} onCancel={() => setSpaceEditor(null)} onSave={persistSpace}/>}
    {(newItemType || itemEditor) && <ItemEditor type={newItemType || itemEditor?.type || "task"} item={itemEditor} initialDate={newItemDate} spaceId={activeId || data.spaces[0]?.id} spaces={data.spaces.filter(s => !s.archived)} availableTags={data.tags ?? []} onCancel={() => { setItemEditor(null); setNewItemType(null); setNewItemDate(undefined); }} onSave={saveItem} onDelete={deleteItem}/>}
    {!showOnboarding && <footer className="mx-auto max-w-6xl border-t line-border px-4 py-6 text-xs leading-5 text-stone-500 sm:px-5 md:px-8">Prototype storage: changes are kept only in this browser’s local storage. This is temporary and not secure multi-device synchronization. Do not store sensitive data.</footer>}
  </main>;
}

function Empty({ title, text, action, actionLabel = "Create a Space" }: { title: string; text: string; action?: () => void; actionLabel?: string }) { return <div className="rounded-md border border-dashed line-border py-16 text-center"><h2 className="font-editorial text-3xl">{title}</h2><p className="mt-2 text-sm text-stone-500">{text}</p>{action && <button type="button" onClick={action} className="mt-5 min-h-11 rounded-md bg-stone-800 px-4 py-2 text-sm text-white dark:bg-stone-100 dark:text-stone-900">{actionLabel}</button>}</div>; }

export function SpaceCard({ space, index, lastIndex, showArchived, onOpen, onReorder, onEdit, onArchive }: { space: Space; index: number; lastIndex: number; showArchived: boolean; onOpen: () => void; onReorder: (direction: -1 | 1) => void; onEdit: () => void; onArchive: () => void }) {
  const Icon = icons[space.icon];
  return <article className="group relative min-h-52 rounded-md border line-border surface p-4 transition-transform hover:-translate-y-0.5 sm:p-5">
    <div className="absolute inset-x-0 top-0 h-1 rounded-t-md" style={{ background: space.accent }}/>
    <button type="button" aria-label={`Open ${space.name}`} onClick={onOpen} className="absolute inset-0 z-0 rounded-md bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-stone-600"/>
    <div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-md" style={{ backgroundColor: `${space.accent}18`, color: space.accent }}><Icon size={22}/></div><div className="relative z-10 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"><button type="button" aria-label={`Move ${space.name} up`} disabled={showArchived || index === 0} onClick={() => onReorder(-1)} className="p-2 disabled:opacity-20"><ArrowUp size={16}/></button><button type="button" aria-label={`Move ${space.name} down`} disabled={showArchived || index === lastIndex} onClick={() => onReorder(1)} className="p-2 disabled:opacity-20"><ArrowDown size={16}/></button></div></div>
    <div className="mt-6 block max-w-full sm:mt-8"><h2 className="break-words font-editorial text-3xl font-medium">{space.name}</h2><p className="mt-2 max-w-xs break-words text-sm leading-6 text-stone-500">{space.description || "A place for what matters here."}</p></div>
    <div className="relative z-10 mt-5 flex items-center justify-end gap-4"><button type="button" onClick={onEdit} className="text-xs text-stone-500 underline underline-offset-4">Edit</button><button type="button" onClick={onArchive} aria-label={`${space.archived ? "Restore" : "Archive"} ${space.name}`} className="p-1 text-stone-500"><Archive size={16}/></button></div>
  </article>;
}

export function SpaceEditor({ value, nextOrder, onCancel, onSave }: { value: Space | null; nextOrder: number; onCancel: () => void; onSave: (space: Space) => void }) {
  const [name, setName] = useState(value?.name || ""); const [description, setDescription] = useState(value?.description || ""); const [icon, setIcon] = useState<SpaceIcon>(value?.icon || "home"); const [accent, setAccent] = useState(value?.accent || accents[0]); const [error, setError] = useState("");
  const submit = () => { if (!name.trim()) { setError("Name is required."); return; } onSave({ id: value?.id || createId(), ownerId: value?.ownerId ?? null, name: name.trim(), description, icon, accent, archived: value?.archived ?? false, sortOrder: value?.sortOrder ?? nextOrder, createdAt: value?.createdAt || now(), updatedAt: now() }); };
  const PreviewIcon = icons[icon];
  return <Modal title={value ? "Edit Space" : "Create a Space"} onClose={onCancel}><form noValidate onSubmit={event => { event.preventDefault(); submit(); }}><div className="grid gap-6 md:grid-cols-[1fr_220px]">
    <div className="space-y-4"><label className="block text-sm">Name<span className="text-red-700"> *</span><input autoFocus aria-required="true" value={name} onChange={e => { setName(e.target.value); setError(""); }} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3 text-base sm:text-sm" /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<label className="block text-sm">Description<textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 min-h-11 w-full resize-y rounded-md border line-border bg-transparent px-3 py-2 text-base sm:text-sm" /></label><fieldset><legend className="mb-2 text-sm">Icon</legend><div className="flex flex-wrap gap-2">{(Object.keys(icons) as SpaceIcon[]).map(key => { const I = icons[key]; return <button type="button" key={key} aria-label={key} aria-pressed={icon === key} onClick={() => setIcon(key)} className={`grid h-11 w-11 place-items-center rounded-md border line-border sm:h-10 sm:w-10 ${icon === key ? "ring-2 ring-stone-600" : ""}`}><I size={18}/></button>; })}</div></fieldset><fieldset><legend className="mb-2 text-sm">Accent</legend><div className="flex flex-wrap gap-2">{accents.map(color => <button type="button" key={color} aria-label={`Choose ${color}`} aria-pressed={accent === color} onClick={() => setAccent(color)} className="grid h-11 w-11 place-items-center rounded-full sm:h-9 sm:w-9" style={{ background: color }}>{accent === color && <Check size={16} className="text-white"/>}</button>)}</div></fieldset></div>
    <div><p className="mb-2 text-xs uppercase tracking-wider text-stone-500">Preview</p><div className="min-h-44 rounded-md border line-border surface p-5"><div className="h-1 -mx-5 -mt-5 mb-5 rounded-t-md" style={{ background: accent }}/><div className="grid h-10 w-10 place-items-center rounded-md" style={{ background: `${accent}18`, color: accent }}><PreviewIcon size={20}/></div><h3 className="mt-6 break-words font-editorial text-3xl">{name || "Untitled Space"}</h3><p className="mt-2 break-words text-sm text-stone-500">{description || "Your description"}</p></div></div>
  </div><Actions onCancel={onCancel} saveLabel={value ? "Save changes" : "Create Space"}/></form></Modal>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useEffect(() => {
    const restoreFocus = previousFocus.current;
    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>("input:not([type='hidden']), textarea, select, button, [tabindex]:not([tabindex='-1'])");
    (dialog?.contains(document.activeElement) ? document.activeElement as HTMLElement : firstFocusable)?.focus();
    return () => restoreFocus?.focus();
  }, []);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    const focusable = [...(dialog?.querySelectorAll<HTMLElement>("input:not([type='hidden']):not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex='-1'])") || [])].filter(element => element.getAttribute("aria-hidden") !== "true");
    if (focusable.length === 0) { event.preventDefault(); dialog?.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;
    const updateViewport = () => setViewport({ height: visualViewport.height, top: visualViewport.offsetTop });
    updateViewport();
    visualViewport.addEventListener("resize", updateViewport);
    visualViewport.addEventListener("scroll", updateViewport);
    return () => {
      visualViewport.removeEventListener("resize", updateViewport);
      visualViewport.removeEventListener("scroll", updateViewport);
    };
  }, []);
  return <div className="fixed inset-x-0 top-0 z-50 grid place-items-end overflow-y-auto overscroll-contain bg-black/35 p-0 pt-[max(1rem,env(safe-area-inset-top))] md:place-items-center md:p-6" style={viewport ? { height: viewport.height, top: viewport.top } : { height: "100dvh" }} onKeyDown={handleKeyDown}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="max-h-full w-full overflow-y-auto overscroll-contain rounded-t-lg bg-[rgb(var(--surface))] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:p-5 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] md:max-w-2xl md:rounded-lg md:p-7 md:pb-7 md:max-h-[92vh]">
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6"><h2 id={titleId} className="break-words font-editorial text-3xl sm:text-4xl">{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-md sm:h-9 sm:w-9"><X/></button></div>
      {children}
    </div>
  </div>;
}
function Actions({ onCancel, saveLabel }: { onCancel: () => void; saveLabel: string }) { return <div className="mt-7 flex flex-wrap justify-end gap-2 border-t line-border pt-5"><button type="button" onClick={onCancel} className="min-h-11 rounded-md border line-border px-4 py-2 text-sm">Cancel</button><button type="submit" className="min-h-11 rounded-md bg-stone-800 px-4 py-2 text-sm text-white dark:bg-stone-100 dark:text-stone-900">{saveLabel}</button></div>; }

export function SpaceView({ space, data, onBack, onEdit, createdTab, onCreatedTabShown, onAdd, onEditItem, onMove, onTogglePin, onToggleTask }: { space: Space; data: AppData; onBack: () => void; onEdit: () => void; createdTab: ItemType | null; onCreatedTabShown: () => void; onAdd: (type: ItemType) => void; onEditItem: (item: ContentItem) => void; onMove: (item: ContentItem, spaceId: string) => void; onTogglePin: (item: ContentItem) => void; onToggleTask: (item: ContentItem) => void }) {
  const Icon = icons[space.icon]; const [tab, setTab] = useState<ItemType | "overview">("overview"); const [query, setQuery] = useState("");
  useEffect(() => {
    if (!createdTab) return;
    const frame = requestAnimationFrame(() => {
      setTab(createdTab);
      setQuery("");
      onCreatedTabShown();
    });
    return () => cancelAnimationFrame(frame);
  }, [createdTab, onCreatedTabShown]);
  const items = data.items.filter(item => item.spaceId === space.id && `${item.title} ${item.type === "note" ? item.body : item.type === "task" ? item.description || "" : item.type === "link" ? item.url : item.entries.map(e => e.text).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const shown = tab === "overview" ? items.filter(item => item.pinned) : items.filter(item => item.type === tab);
  return <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 md:px-8">
    <button onClick={onBack} className="mb-7 inline-flex min-h-11 items-center rounded-md pr-3 text-sm text-stone-500 sm:min-h-0 sm:pr-0">← All Spaces</button>
    <div className="border-b line-border pb-7"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 flex-1 gap-3 sm:gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-md" style={{ background: `${space.accent}18`, color: space.accent }}><Icon size={28}/></div><div className="min-w-0"><h1 className="break-words font-editorial text-4xl font-medium sm:text-5xl md:text-6xl">{space.name}</h1><p className="mt-2 max-w-2xl break-words text-sm leading-6 text-stone-500">{space.description || "A place for what matters here."}</p></div></div><button onClick={onEdit} className="shrink-0 rounded-md border line-border px-3 py-2 text-sm">Edit</button></div></div>
    <div className="my-6 min-w-0 border-b line-border pb-4">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto" role="tablist" aria-label="Space content" aria-orientation="horizontal">{(["overview", "task", "note", "list", "link"] as const).map(type => <button key={type} type="button" role="tab" aria-selected={tab === type} onClick={() => setTab(type)} data-selected={tab === type} className={`content-tab min-h-11 shrink-0 rounded-t-md border-b-2 px-2 py-2 text-sm capitalize transition-colors sm:px-3 sm:min-h-0 ${tab === type ? "border-transparent font-semibold" : "border-transparent"}`}>{type === "overview" ? "Overview" : `${itemLabels[type]}s`}</button>)}</div>
        <CreationMenu onAdd={onAdd}/>
      </div>
      <div className="relative mt-3 sm:ml-auto sm:max-w-56"><Search className="absolute left-3 top-2.5 text-stone-400" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search items" className="h-11 w-full rounded-md border line-border bg-transparent pl-9 pr-3 text-base sm:h-10 sm:text-sm" /></div>
    </div>
    {shown.length ? <div className="grid gap-3 md:grid-cols-2">{shown.map(item => <ItemCard key={item.id} item={item} tags={(data.tags ?? []).filter(tag => item.type === "link" && item.tagIds?.includes(tag.id))} spaces={data.spaces.filter(s => !s.archived)} onEdit={() => onEditItem(item)} onMove={spaceId => onMove(item, spaceId)} onTogglePin={() => onTogglePin(item)} onToggleTask={() => onToggleTask(item)}/>)}</div> : <Empty title={tab === "overview" ? "Nothing pinned yet" : `No ${itemLabels[tab as ItemType]?.toLowerCase() || "items"}s here`} text={tab === "overview" ? "Pin useful things so they stay close at hand." : "Add the first one and make this Space your own."} action={tab === "overview" ? undefined : () => onAdd(tab)} actionLabel={tab === "task" ? "Create a Task" : tab === "note" ? "Create a Note" : tab === "list" ? "Create a List" : "Add a Link"}/>}
  </section>;
}

export function CreationMenu({ onAdd }: { onAdd: (type: ItemType) => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      menuRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup='menu']")?.focus();
    }
    if (open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const options = [...menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") || []];
      const current = options.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "ArrowDown" ? (current + 1) % options.length : (current - 1 + options.length) % options.length;
      options[next]?.focus();
    }
  };
  return <div ref={menuRef} className="relative" onKeyDown={handleKeyDown}>
    <button type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? "space-create-menu" : undefined} onClick={() => { setOpen(value => !value); requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus()); }} className="flex h-11 shrink-0 items-center gap-1 rounded-md border line-border bg-[rgb(var(--surface))] px-2 text-sm sm:h-10 sm:gap-2 sm:border-0 sm:bg-stone-800 sm:px-4 sm:text-white dark:sm:bg-stone-100 dark:sm:text-stone-900">
      <Plus size={16}/> New <ChevronDown size={15}/>
    </button>
    {open && <div id="space-create-menu" role="menu" aria-label="Create new item" className="absolute right-0 z-20 mt-2 w-48 rounded-md border line-border surface p-1 shadow-lg sm:w-40">
      {(["task", "note", "list", "link"] as ItemType[]).map(type => <button key={type} type="button" role="menuitem" onClick={() => { setOpen(false); onAdd(type); }} className="block min-h-12 w-full rounded px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 sm:min-h-10">{itemLabels[type]}</button>)}
    </div>}
  </div>;
}

function ItemCard({ item, tags, spaces, onEdit, onMove, onTogglePin, onToggleTask }: { item: ContentItem; tags: Tag[]; spaces: Space[]; onEdit: () => void; onMove: (id: string) => void; onTogglePin: () => void; onToggleTask: () => void }) {
  const detail = item.type === "task" ? item.description : item.type === "note" ? item.body : item.type === "link" ? item.url : `${item.entries.filter(e => e.checked).length}/${item.entries.length} checked`;
  return <article className="rounded-md border line-border surface p-4"><div className="flex items-start gap-3"><div className="flex min-w-0 flex-1 items-start gap-2">{item.type === "task" && <button type="button" onClick={onToggleTask} className={`mt-1 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full border ${item.completed ? "bg-stone-700 text-white" : ""}`} aria-label="Toggle task completion">{item.completed && <Check size={13}/>}</button>}<button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left"><span className={`block font-editorial text-2xl ${item.type === "task" && item.completed ? "line-through opacity-50" : ""}`}>{item.title}</span><span className={`mt-2 line-clamp-2 block text-sm leading-6 text-stone-500 ${item.type === "link" ? "break-all" : "break-words"}`}>{detail}</span>{item.type === "link" && item.notes && <span className="mt-1 line-clamp-2 block break-words text-sm leading-6 text-stone-500">{item.notes}</span>}{item.type === "task" && item.dueDate && <span className="mt-2 block text-xs text-stone-500">Due {item.dueDate}</span>}</button></div><button type="button" onClick={onTogglePin} aria-label={item.pinned ? "Unpin item" : "Pin item"} className="p-1 text-stone-500">{item.pinned ? <PinOff size={17}/> : <Pin size={17}/>}</button></div>
    {item.type === "link" && tags.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`Tags for ${item.title}`}>{tags.map(tag => <li key={tag.id} className="rounded-full border line-border px-2.5 py-1 text-xs text-stone-600 dark:text-stone-300">{tag.name}</li>)}</ul>}
    <div className="mt-4 flex items-center justify-between border-t line-border pt-3"><button onClick={onEdit} className="text-xs underline underline-offset-4">Edit</button><label className="flex items-center gap-2 text-xs text-stone-500"><span>Move to</span><select value={item.spaceId} onChange={e => onMove(e.target.value)} className="max-w-28 rounded border line-border bg-transparent px-2 py-1">{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
  </article>;
}

export function ItemEditor({ type, item, initialDate, spaceId, spaces, availableTags = [], onCancel, onSave, onDelete }: { type: ItemType; item: ContentItem | null; initialDate?: string; spaceId: string; spaces: Space[]; availableTags?: Tag[]; onCancel: () => void; onSave: (item: ContentItem, tags?: Tag[]) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState(item?.title || ""); const [targetSpace, setTargetSpace] = useState(item?.spaceId || spaceId); const [taskDescription, setTaskDescription] = useState(item?.type === "task" ? item.description || "" : ""); const [dueDate, setDueDate] = useState(item?.type === "task" ? item.dueDate || "" : initialDate || ""); const [priority, setPriority] = useState<"low" | "medium" | "high">(item?.type === "task" ? item.priority : "medium"); const [completed, setCompleted] = useState(item?.type === "task" ? item.completed : false);
  const [body, setBody] = useState(item?.type === "note" ? item.body : ""); const [url, setUrl] = useState(item?.type === "link" ? item.url : ""); const [notes, setNotes] = useState(item?.type === "link" ? item.notes ?? "" : ""); const [entries, setEntries] = useState<ListEntry[]>(item?.type === "list" ? item.entries : [{ id: createId(), text: "", checked: false }]); const [pinned, setPinned] = useState(item?.pinned || false); const [error, setError] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(item?.type === "link" ? item.tagIds ?? [] : []);
  const [createdTags, setCreatedTags] = useState<Tag[]>([]);
  const [customTagName, setCustomTagName] = useState("");
  const tags = normalizeTagRegistry([...availableTags, ...suggestedTags, ...createdTags]).tags;
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
  const toggleTag = (id: string) => setSelectedTagIds(current => current.includes(id) ? current.filter(tagId => tagId !== id) : [...current, id]);
  const addCustomTag = () => {
    const name = customTagName.trim().replace(/\s+/g, " ");
    const key = normalizeTagName(name);
    if (!key) return;
    const existing = tags.find(tag => normalizeTagName(tag.name) === key);
    if (existing) {
      setSelectedTagIds(current => current.includes(existing.id) ? current : [...current, existing.id]);
    } else {
      const tag = { id: `custom-${createId()}`, name };
      setCreatedTags(current => [...current, tag]);
      setSelectedTagIds(current => [...current, tag.id]);
    }
    setCustomTagName("");
  };
  const submit = () => { if (!title.trim()) { setError("Title is required."); return; } if (type === "link") { try { const parsed = new URL(url); if (!parsed.protocol.startsWith("http")) throw new Error(); } catch { setError("Enter a valid http or https URL."); return; } } const base = { id: item?.id || createId(), ownerId: null, spaceId: targetSpace, title: title.trim(), pinned, createdAt: item?.createdAt || now(), updatedAt: now() }; let result: ContentItem; if (type === "task") result = { ...base, type: "task", description: taskDescription, dueDate: dueDate || undefined, completed, priority }; else if (type === "note") result = { ...base, type: "note", body }; else if (type === "list") result = { ...base, type: "list", entries: entries.filter(e => e.text.trim()).map(e => ({ ...e, text: e.text.trim() })) }; else result = { ...base, type: "link", url, notes: notes.trim(), tagIds: selectedTagIds }; if (type === "link") onSave(result, selectedTags); else onSave(result); };
  return <Modal title={`${item ? "Edit" : "Add"} ${itemLabels[type]}`} onClose={onCancel}><form noValidate onSubmit={event => { event.preventDefault(); submit(); }}><div className="space-y-4"><label className="block text-sm">Title<input autoFocus aria-required="true" value={title} onChange={e => { setTitle(e.target.value); setError(""); }} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3 text-base sm:text-sm" /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {type === "task" && <div><label className="block text-sm">Description<textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} rows={3} className="mt-1 min-h-11 w-full resize-y rounded-md border line-border bg-transparent px-3 py-2 text-base sm:text-sm" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Due date<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3 text-base sm:text-sm" /></label><label className="text-sm">Priority<select value={priority} onChange={e => setPriority(e.target.value as "low" | "medium" | "high")} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3 text-base sm:text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div><label className="flex min-h-11 items-center gap-2 text-sm"><input className="h-5 w-5" type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)}/> Completed</label></div>}
    {type === "note" && <label className="block text-sm">Body<textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className="mt-1 min-h-11 w-full resize-y rounded-md border line-border bg-transparent px-3 py-2 text-base sm:text-sm" /></label>}
    {type === "link" && <>
      <label className="block text-sm">URL<input type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3 text-base sm:text-sm" /></label>
      <label className="block text-sm">Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 min-h-11 w-full resize-y rounded-md border line-border bg-transparent px-3 py-2 text-base sm:text-sm" /></label>
      <fieldset className="space-y-3">
        <legend className="text-sm">Tags</legend>
        <div className="flex flex-wrap gap-2">{tags.map(tag => <button key={tag.id} type="button" aria-pressed={selectedTagIds.includes(tag.id)} onClick={() => toggleTag(tag.id)} className={`min-h-11 rounded-full border px-3 text-sm transition-colors ${selectedTagIds.includes(tag.id) ? "border-stone-500 bg-stone-200 dark:bg-stone-700" : "line-border bg-transparent"}`}>{tag.name}</button>)}</div>
        <p className="text-xs text-stone-500">Tags are reusable across your Spaces.</p>
        <div className="flex min-w-0 gap-2">
          <label className="min-w-0 flex-1 text-sm">Create a tag<input value={customTagName} onChange={event => setCustomTagName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addCustomTag(); } }} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3 text-base sm:text-sm" /></label>
          <button type="button" onClick={addCustomTag} className="mt-6 min-h-11 shrink-0 rounded-md border line-border px-3 text-sm">Add tag</button>
        </div>
      </fieldset>
    </>}
    {type === "list" && <fieldset><legend className="mb-2 text-sm">Entries</legend>{entries.map((entry, index) => <div key={entry.id} className="mb-2 flex min-w-0 items-center gap-2"><input aria-label={`Mark list entry ${index + 1} complete`} className="h-5 w-5 shrink-0" checked={entry.checked} type="checkbox" onChange={() => setEntries(entries.map((e, i) => i === index ? { ...e, checked: !e.checked } : e))}/><input aria-label={`List entry ${index + 1}`} value={entry.text} onChange={e => setEntries(entries.map((en, i) => i === index ? { ...en, text: e.target.value } : en))} className="h-11 min-w-0 flex-1 rounded-md border line-border bg-transparent px-3 text-base sm:text-sm"/><button type="button" aria-label={`Remove list entry ${index + 1}`} onClick={() => setEntries(entries.filter((_, i) => i !== index))} className="grid h-11 w-11 shrink-0 place-items-center rounded-md"><Trash2 size={16}/></button></div>)}<button type="button" onClick={() => setEntries([...entries, { id: createId(), text: "", checked: false }])} className="mt-1 min-h-11 text-sm underline underline-offset-4">Add entry</button></fieldset>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Space<select value={targetSpace} onChange={e => setTargetSpace(e.target.value)} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3 text-base sm:text-sm">{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="flex min-h-11 items-center gap-2 self-end text-sm"><input className="h-5 w-5" type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)}/> Pin to overview</label></div></div><div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t line-border pt-5"><div>{item && <button type="button" onClick={() => onDelete(item.id)} className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-red-700"><Trash2 size={16}/>Delete</button>}</div><Actions onCancel={onCancel} saveLabel={item ? "Save changes" : `Add ${itemLabels[type].toLowerCase()}`}/></div></form></Modal>;
}
