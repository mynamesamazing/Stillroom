"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowDown, ArrowUp, BookOpen, Briefcase, Check, ChevronDown, ChevronRight, Heart, Home, Leaf, Moon, Palette, Pin, PinOff, Plus, Search, Sun, Trash2, X } from "lucide-react";
import { AppData, ContentItem, ItemType, ListEntry, Space, SpaceIcon, createId, now } from "@/lib/models";
import { repository, seedData } from "@/lib/repositories/localRepository";

const icons = { home: Home, book: BookOpen, palette: Palette, heart: Heart, briefcase: Briefcase, leaf: Leaf };
const accents = ["#9B6849", "#5F7257", "#A76A76", "#62758C", "#A27B43", "#77705E"];
const itemLabels: Record<ItemType, string> = { task: "Task", note: "Note", list: "List", link: "Link" };
export const itemTypeTab = (type: ItemType): ItemType => type;
export const shouldShowOnboarding = (isNewWorkspace: boolean, hasStorageWarning: boolean) => isNewWorkspace && !hasStorageWarning;

export function StillroomApp() {
  const [data, setData] = useState<AppData>(seedData);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"library" | "space">("library");
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
    if (storageWritesBlocked) { setStorageWarning("Stillroom preserved existing unreadable data. Resolve the recovery warning before saving changes."); return; }
    try { await repository.save(next); setData(next); setStorageWarning(null); }
    catch (error) { setStorageWarning(error instanceof Error ? error.message : failureMessage); }
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
  const saveItem = async (item: ContentItem) => {
    if (storageWritesBlocked) { setStorageWarning("Stillroom preserved existing unreadable data. Resolve the recovery warning before saving changes."); return; }
    try {
      const exists = data.items.some(i => i.id === item.id);
      const saved = exists ? await repository.updateItem(item) : await repository.createItem(item);
      const next = { ...data, items: exists ? data.items.map(i => i.id === saved.id ? saved : i) : [...data.items, saved] };
      await repository.save(next);
      setData(next);
      setStorageWarning(null);
      if (!exists) setCreatedTab(saved.type);
      setItemEditor(null); setNewItemType(null);
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
    {storageWarning && <div role="status" className="border-b border-red-300 bg-red-50 px-5 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"><div className="mx-auto flex max-w-6xl items-start justify-between gap-4"><span>{storageWarning}</span><button type="button" onClick={() => setStorageWarning(null)} aria-label="Dismiss storage warning" className="shrink-0 underline underline-offset-4">Dismiss</button></div></div>}
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
      <button onClick={() => setView("library") } className="font-editorial text-3xl font-semibold tracking-wide">Stillroom</button>
      <button onClick={() => setDark(v => !v)} className="grid h-9 w-9 place-items-center rounded-full border line-border" aria-label={`Use ${dark ? "day" : "night"} theme`}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
    </header>
    {showOnboarding ? <section className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-xl items-center px-5 py-10 text-center sm:px-8"><div className="w-full"><p className="mb-4 text-xs uppercase tracking-[0.22em] onboarding-muted">Stillroom beta</p><h1 className="font-editorial text-4xl font-medium leading-tight sm:text-5xl md:text-6xl">Make yourself at home.</h1><p className="mx-auto mt-5 max-w-md text-base leading-7 onboarding-muted">A little room for everything on your mind.</p><div className="mx-auto mt-8 flex max-w-sm flex-col gap-3"><button type="button" onClick={createFirstSpace} className="min-h-12 w-full rounded-md bg-stone-800 px-5 py-3 text-sm text-white dark:bg-stone-100 dark:text-stone-900">Create your first Space</button><button type="button" onClick={exploreSamples} className="min-h-12 w-full rounded-md border line-border surface px-5 py-3 text-sm">Explore with sample Spaces</button></div><p className="mx-auto mt-7 max-w-lg text-xs leading-5 onboarding-muted">This beta stores data only in this browser. It does not sync across devices, and clearing browser data can erase your content. Please avoid storing sensitive information.</p></div></section> : view === "library" ? <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8">
      <div className="mb-8 flex items-end justify-between gap-4 border-b line-border pb-7">
        <div><p className="mb-2 text-xs uppercase tracking-[0.22em] text-stone-500">Your places</p><h1 className="font-editorial text-5xl font-medium md:text-6xl">Spaces</h1></div>
        <button onClick={() => setSpaceEditor("new") } className="flex h-11 items-center gap-2 rounded-md bg-stone-800 px-4 text-sm text-white dark:bg-stone-100 dark:text-stone-900"><Plus size={17}/> Create Space</button>
      </div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3 text-stone-400" size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Spaces" className="h-11 w-full rounded-md border line-border bg-transparent pl-10 pr-3" /></div>
        <button onClick={() => setShowArchived(v => !v)} className="text-sm underline decoration-stone-400 underline-offset-4">{showArchived ? "View active Spaces" : "View archived Spaces"}</button>
      </div>
      {spaces.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{spaces.map((space, index) => { const Icon = icons[space.icon]; return <article key={space.id} className="group relative min-h-52 rounded-md border line-border surface p-5 transition-transform hover:-translate-y-0.5">
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-md" style={{ background: space.accent }}/>
        <div className="flex items-start justify-between"><button onClick={() => openSpace(space.id)} aria-label={`Open ${space.name}`} className="grid h-11 w-11 place-items-center rounded-md" style={{ backgroundColor: `${space.accent}18`, color: space.accent }}><Icon size={22}/></button><div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100"><button aria-label={`Move ${space.name} up`} disabled={showArchived || index === 0} onClick={() => reorder(space.id, -1)} className="p-2 disabled:opacity-20"><ArrowUp size={16}/></button><button aria-label={`Move ${space.name} down`} disabled={showArchived || index === spaces.length - 1} onClick={() => reorder(space.id, 1)} className="p-2 disabled:opacity-20"><ArrowDown size={16}/></button></div></div>
        <button onClick={() => openSpace(space.id)} className="mt-8 text-left"><h2 className="font-editorial text-3xl font-medium">{space.name}</h2><p className="mt-2 max-w-xs text-sm leading-6 text-stone-500">{space.description || "A place for what matters here."}</p></button>
        <div className="mt-5 flex items-center justify-between"><button onClick={() => openSpace(space.id)} className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider" style={{ color: space.accent }}>Open <ChevronRight size={14}/></button><button onClick={() => setSpaceEditor(space)} className="text-xs text-stone-500 underline underline-offset-4">Edit</button><button onClick={() => archiveSpace(space.id, !space.archived)} aria-label={`${space.archived ? "Restore" : "Archive"} ${space.name}`} className="p-1 text-stone-500"><Archive size={16}/></button></div>
      </article>})}</div> : <Empty title={showArchived ? "No archived Spaces" : "No Spaces found"} text={showArchived ? "Archived Spaces will rest here." : "Create a Space to begin organizing your life."} action={!showArchived ? () => setSpaceEditor("new") : undefined}/>}
    </section> : activeSpace ? <SpaceView space={activeSpace} data={data} onBack={() => setView("library") } onEdit={() => setSpaceEditor(activeSpace)} createdTab={createdTab} onCreatedTabShown={() => setCreatedTab(null)} onAdd={setNewItemType} onEditItem={setItemEditor} onMove={(item, spaceId) => saveItem({ ...item, spaceId })} onTogglePin={item => saveItem({ ...item, pinned: !item.pinned })} onToggleTask={item => item.type === "task" && saveItem({ ...item, completed: !item.completed })} /> : null}
    {spaceEditor && <SpaceEditor value={spaceEditor === "new" ? null : spaceEditor} nextOrder={data.spaces.length} onCancel={() => setSpaceEditor(null)} onSave={persistSpace}/>}
    {(newItemType || itemEditor) && <ItemEditor type={newItemType || itemEditor?.type || "task"} item={itemEditor} spaceId={activeId || data.spaces[0]?.id} spaces={data.spaces.filter(s => !s.archived)} onCancel={() => { setItemEditor(null); setNewItemType(null); }} onSave={saveItem} onDelete={deleteItem}/>}
    {!showOnboarding && <footer className="mx-auto max-w-6xl border-t line-border px-5 py-6 text-xs leading-5 text-stone-500 md:px-8">Prototype storage: changes are kept only in this browser’s local storage. This is temporary and not secure multi-device synchronization. Do not store sensitive data.</footer>}
  </main>;
}

function Empty({ title, text, action }: { title: string; text: string; action?: () => void }) { return <div className="rounded-md border border-dashed line-border py-16 text-center"><h2 className="font-editorial text-3xl">{title}</h2><p className="mt-2 text-sm text-stone-500">{text}</p>{action && <button onClick={action} className="mt-5 rounded-md bg-stone-800 px-4 py-2 text-sm text-white dark:bg-stone-100 dark:text-stone-900">Create a Space</button>}</div>; }

function SpaceEditor({ value, nextOrder, onCancel, onSave }: { value: Space | null; nextOrder: number; onCancel: () => void; onSave: (space: Space) => void }) {
  const [name, setName] = useState(value?.name || ""); const [description, setDescription] = useState(value?.description || ""); const [icon, setIcon] = useState<SpaceIcon>(value?.icon || "home"); const [accent, setAccent] = useState(value?.accent || accents[0]); const [error, setError] = useState("");
  const submit = () => { if (!name.trim()) { setError("Name is required."); return; } onSave({ id: value?.id || createId(), ownerId: value?.ownerId ?? null, name: name.trim(), description, icon, accent, archived: value?.archived ?? false, sortOrder: value?.sortOrder ?? nextOrder, createdAt: value?.createdAt || now(), updatedAt: now() }); };
  const PreviewIcon = icons[icon];
  return <Modal title={value ? "Edit Space" : "Create a Space"} onClose={onCancel}><div className="grid gap-6 md:grid-cols-[1fr_220px]">
    <div className="space-y-4"><label className="block text-sm">Name<span className="text-red-700"> *</span><input autoFocus value={name} onChange={e => { setName(e.target.value); setError(""); }} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3" /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<label className="block text-sm">Description<textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 w-full resize-none rounded-md border line-border bg-transparent px-3 py-2" /></label><fieldset><legend className="mb-2 text-sm">Icon</legend><div className="flex flex-wrap gap-2">{(Object.keys(icons) as SpaceIcon[]).map(key => { const I = icons[key]; return <button key={key} aria-label={key} onClick={() => setIcon(key)} className={`grid h-10 w-10 place-items-center rounded-md border line-border ${icon === key ? "ring-2 ring-stone-600" : ""}`}><I size={18}/></button>; })}</div></fieldset><fieldset><legend className="mb-2 text-sm">Accent</legend><div className="flex gap-2">{accents.map(color => <button key={color} aria-label={`Choose ${color}`} onClick={() => setAccent(color)} className="grid h-9 w-9 place-items-center rounded-full" style={{ background: color }}>{accent === color && <Check size={16} className="text-white"/>}</button>)}</div></fieldset></div>
    <div><p className="mb-2 text-xs uppercase tracking-wider text-stone-500">Preview</p><div className="min-h-44 rounded-md border line-border surface p-5"><div className="h-1 -mx-5 -mt-5 mb-5 rounded-t-md" style={{ background: accent }}/><div className="grid h-10 w-10 place-items-center rounded-md" style={{ background: `${accent}18`, color: accent }}><PreviewIcon size={20}/></div><h3 className="mt-6 font-editorial text-3xl">{name || "Untitled Space"}</h3><p className="mt-2 text-sm text-stone-500">{description || "Your description"}</p></div></div>
  </div><Actions onCancel={onCancel} onSave={submit} saveLabel={value ? "Save changes" : "Create Space"}/></Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-0 md:place-items-center md:p-6"><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-[rgb(var(--surface))] p-5 shadow-xl md:max-w-2xl md:rounded-lg md:p-7"><div className="mb-6 flex items-center justify-between"><h2 className="font-editorial text-4xl">{title}</h2><button aria-label="Close" onClick={onClose}><X/></button></div>{children}</div></div>; }
function Actions({ onCancel, onSave, saveLabel }: { onCancel: () => void; onSave: () => void; saveLabel: string }) { return <div className="mt-7 flex justify-end gap-2 border-t line-border pt-5"><button onClick={onCancel} className="rounded-md border line-border px-4 py-2 text-sm">Cancel</button><button onClick={onSave} className="rounded-md bg-stone-800 px-4 py-2 text-sm text-white dark:bg-stone-100 dark:text-stone-900">{saveLabel}</button></div>; }

function SpaceView({ space, data, onBack, onEdit, createdTab, onCreatedTabShown, onAdd, onEditItem, onMove, onTogglePin, onToggleTask }: { space: Space; data: AppData; onBack: () => void; onEdit: () => void; createdTab: ItemType | null; onCreatedTabShown: () => void; onAdd: (type: ItemType) => void; onEditItem: (item: ContentItem) => void; onMove: (item: ContentItem, spaceId: string) => void; onTogglePin: (item: ContentItem) => void; onToggleTask: (item: ContentItem) => void }) {
  const Icon = icons[space.icon]; const [tab, setTab] = useState<ItemType | "overview">("overview"); const [query, setQuery] = useState(""); const [newMenuOpen, setNewMenuOpen] = useState(false); const newMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!createdTab) return;
    const frame = requestAnimationFrame(() => {
      setTab(createdTab);
      setQuery("");
      onCreatedTabShown();
    });
    return () => cancelAnimationFrame(frame);
  }, [createdTab, onCreatedTabShown]);
  useEffect(() => {
    if (!newMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!newMenuRef.current?.contains(event.target as Node)) setNewMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [newMenuOpen]);
  const items = data.items.filter(item => item.spaceId === space.id && `${item.title} ${item.type === "note" ? item.body : item.type === "task" ? item.description || "" : item.type === "link" ? item.url : item.entries.map(e => e.text).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const shown = tab === "overview" ? items.filter(item => item.pinned) : items.filter(item => item.type === tab);
  return <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8">
    <button onClick={onBack} className="mb-7 text-sm text-stone-500">← All Spaces</button>
    <div className="border-b line-border pb-7"><div className="flex items-start justify-between gap-4"><div className="flex gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-md" style={{ background: `${space.accent}18`, color: space.accent }}><Icon size={28}/></div><div><h1 className="font-editorial text-5xl font-medium md:text-6xl">{space.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">{space.description || "A place for what matters here."}</p></div></div><button onClick={onEdit} className="rounded-md border line-border px-3 py-2 text-sm">Edit</button></div></div>
    <div className="my-6 flex flex-col gap-3 border-b line-border pb-4 sm:flex-row sm:items-end sm:justify-between"><div className="flex min-w-0 gap-1 overflow-x-auto" role="tablist" aria-label="Space content">{(["overview", "task", "note", "list", "link"] as const).map(type => <button key={type} type="button" role="tab" aria-selected={tab === type} onClick={() => setTab(type)} data-selected={tab === type} className={`content-tab shrink-0 rounded-t-md border-b-2 px-3 py-2 text-sm capitalize transition-colors ${tab === type ? "border-transparent font-semibold" : "border-transparent"}`}>{type === "overview" ? "Overview" : `${itemLabels[type]}s`}</button>)}</div><div className="relative"><Search className="absolute left-3 top-2.5 text-stone-400" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search items" className="h-10 w-full rounded-md border line-border bg-transparent pl-9 pr-3 sm:w-56" /></div></div>
    <div className="mb-5 flex justify-end border-b line-border pb-5"><div ref={newMenuRef} className="relative" onKeyDown={e => { if (e.key === "Escape") { setNewMenuOpen(false); newMenuRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup='menu']")?.focus(); } if (newMenuOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); const options = [...newMenuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") || []]; const current = options.indexOf(document.activeElement as HTMLButtonElement); const next = e.key === "ArrowDown" ? (current + 1) % options.length : (current - 1 + options.length) % options.length; options[next]?.focus(); } }}><button type="button" aria-haspopup="menu" aria-expanded={newMenuOpen} onClick={() => { setNewMenuOpen(open => !open); requestAnimationFrame(() => newMenuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus()); }} className="flex h-10 items-center gap-2 rounded-md bg-stone-800 px-4 text-sm text-white dark:bg-stone-100 dark:text-stone-900"><Plus size={16}/> New <ChevronDown size={15}/></button>{newMenuOpen && <div role="menu" aria-label="Create new item" className="absolute right-0 z-20 mt-2 w-40 rounded-md border line-border surface p-1 shadow-lg">{(["task", "note", "list", "link"] as ItemType[]).map(type => <button key={type} type="button" role="menuitem" onClick={() => { setNewMenuOpen(false); onAdd(type); }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700">{itemLabels[type]}</button>)}</div>}</div></div>
    {shown.length ? <div className="grid gap-3 md:grid-cols-2">{shown.map(item => <ItemCard key={item.id} item={item} spaces={data.spaces.filter(s => !s.archived)} onEdit={() => onEditItem(item)} onMove={spaceId => onMove(item, spaceId)} onTogglePin={() => onTogglePin(item)} onToggleTask={() => onToggleTask(item)}/>)}</div> : <Empty title={tab === "overview" ? "Nothing pinned yet" : `No ${itemLabels[tab as ItemType]?.toLowerCase() || "items"}s here`} text={tab === "overview" ? "Pin useful things so they stay close at hand." : "Add the first one and make this Space your own."} action={() => onAdd(tab === "overview" ? "task" : tab as ItemType)}/>}
  </section>;
}

function ItemCard({ item, spaces, onEdit, onMove, onTogglePin, onToggleTask }: { item: ContentItem; spaces: Space[]; onEdit: () => void; onMove: (id: string) => void; onTogglePin: () => void; onToggleTask: () => void }) {
  const detail = item.type === "task" ? item.description : item.type === "note" ? item.body : item.type === "link" ? item.url : `${item.entries.filter(e => e.checked).length}/${item.entries.length} checked`;
  return <article className="rounded-md border line-border surface p-4"><div className="flex items-start gap-3"><div className="flex min-w-0 flex-1 items-start gap-2">{item.type === "task" && <button type="button" onClick={onToggleTask} className={`mt-1 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full border ${item.completed ? "bg-stone-700 text-white" : ""}`} aria-label="Toggle task completion">{item.completed && <Check size={13}/>}</button>}<button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left"><span className={`block font-editorial text-2xl ${item.type === "task" && item.completed ? "line-through opacity-50" : ""}`}>{item.title}</span><span className="mt-2 line-clamp-2 block text-sm leading-6 text-stone-500">{detail}</span>{item.type === "task" && item.dueDate && <span className="mt-2 block text-xs text-stone-500">Due {item.dueDate}</span>}</button></div><button type="button" onClick={onTogglePin} aria-label={item.pinned ? "Unpin item" : "Pin item"} className="p-1 text-stone-500">{item.pinned ? <PinOff size={17}/> : <Pin size={17}/>}</button></div>
    <div className="mt-4 flex items-center justify-between border-t line-border pt-3"><button onClick={onEdit} className="text-xs underline underline-offset-4">Edit</button><label className="flex items-center gap-2 text-xs text-stone-500"><span>Move to</span><select value={item.spaceId} onChange={e => onMove(e.target.value)} className="max-w-28 rounded border line-border bg-transparent px-2 py-1">{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
  </article>;
}

function ItemEditor({ type, item, spaceId, spaces, onCancel, onSave, onDelete }: { type: ItemType; item: ContentItem | null; spaceId: string; spaces: Space[]; onCancel: () => void; onSave: (item: ContentItem) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState(item?.title || ""); const [targetSpace, setTargetSpace] = useState(item?.spaceId || spaceId); const [taskDescription, setTaskDescription] = useState(item?.type === "task" ? item.description || "" : ""); const [dueDate, setDueDate] = useState(item?.type === "task" ? item.dueDate || "" : ""); const [priority, setPriority] = useState<"low" | "medium" | "high">(item?.type === "task" ? item.priority : "medium"); const [completed, setCompleted] = useState(item?.type === "task" ? item.completed : false);
  const [body, setBody] = useState(item?.type === "note" ? item.body : ""); const [url, setUrl] = useState(item?.type === "link" ? item.url : ""); const [entries, setEntries] = useState<ListEntry[]>(item?.type === "list" ? item.entries : [{ id: createId(), text: "", checked: false }]); const [pinned, setPinned] = useState(item?.pinned || false); const [error, setError] = useState("");
  const submit = () => { if (!title.trim()) { setError("Title is required."); return; } if (type === "link") { try { const parsed = new URL(url); if (!parsed.protocol.startsWith("http")) throw new Error(); } catch { setError("Enter a valid http or https URL."); return; } } const base = { id: item?.id || createId(), ownerId: null, spaceId: targetSpace, title: title.trim(), pinned, createdAt: item?.createdAt || now(), updatedAt: now() }; let result: ContentItem; if (type === "task") result = { ...base, type: "task", description: taskDescription, dueDate: dueDate || undefined, completed, priority }; else if (type === "note") result = { ...base, type: "note", body }; else if (type === "list") result = { ...base, type: "list", entries: entries.filter(e => e.text.trim()).map(e => ({ ...e, text: e.text.trim() })) }; else result = { ...base, type: "link", url }; onSave(result); };
  return <Modal title={`${item ? "Edit" : "Add"} ${itemLabels[type]}`} onClose={onCancel}><div className="space-y-4"><label className="block text-sm">Title<input autoFocus value={title} onChange={e => { setTitle(e.target.value); setError(""); }} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3" /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {type === "task" && <div><label className="block text-sm">Description<textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-md border line-border bg-transparent px-3 py-2" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Due date<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3" /></label><label className="text-sm">Priority<select value={priority} onChange={e => setPriority(e.target.value as "low" | "medium" | "high")} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)}/> Completed</label></div>}
    {type === "note" && <label className="block text-sm">Body<textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className="mt-1 w-full rounded-md border line-border bg-transparent px-3 py-2" /></label>}
    {type === "link" && <label className="block text-sm">URL<input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3" /></label>}
    {type === "list" && <div><p className="mb-2 text-sm">Entries</p>{entries.map((entry, index) => <div key={entry.id} className="mb-2 flex gap-2"><input checked={entry.checked} type="checkbox" onChange={() => setEntries(entries.map((e, i) => i === index ? { ...e, checked: !e.checked } : e))}/><input value={entry.text} onChange={e => setEntries(entries.map((en, i) => i === index ? { ...en, text: e.target.value } : en))} className="h-10 flex-1 rounded-md border line-border bg-transparent px-3"/><button aria-label="Remove entry" onClick={() => setEntries(entries.filter((_, i) => i !== index))}><Trash2 size={16}/></button></div>)}<button onClick={() => setEntries([...entries, { id: createId(), text: "", checked: false }])} className="mt-1 text-sm underline underline-offset-4">Add entry</button></div>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Space<select value={targetSpace} onChange={e => setTargetSpace(e.target.value)} className="mt-1 h-11 w-full rounded-md border line-border bg-transparent px-3">{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)}/> Pin to overview</label></div></div><div className="mt-7 flex items-center justify-between border-t line-border pt-5"><div>{item && <button onClick={() => onDelete(item.id)} className="flex items-center gap-2 text-sm text-red-700"><Trash2 size={16}/>Delete</button>}</div><Actions onCancel={onCancel} onSave={submit} saveLabel={item ? "Save changes" : `Add ${itemLabels[type].toLowerCase()}`}/></div></Modal>;
}
