"use client";

import React from "react";
import { AppData, CalendarEntry, ContentItem, Space, TaskItem } from "@/lib/models";
import { dateLabel, entryOccursOnDate, localDateKey, parseLocalDate } from "@/lib/dates";
import { DayDial } from "@/components/DayDial";

export function HomeDashboard({ data, spaces, selectedDate, onSelectDate, onOpenCalendar, onOpenItem, onOpenSpace, onSaveCalendarEntry, children }: {
  data: AppData;
  spaces: Space[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenCalendar: () => void;
  onOpenItem: (item: ContentItem) => void;
  onOpenSpace: (spaceId: string) => void;
  onSaveCalendarEntry?: (entry: CalendarEntry) => Promise<boolean>;
  children?: React.ReactNode;
}) {
  const today = new Date();
  const todayKey = localDateKey(today);
  const selectedDay = parseLocalDate(selectedDate);
  const selectedDayItems = data.items.filter((item): item is TaskItem => item.type === "task" && item.dueDate === selectedDate);
  const entries = data.calendarEntries ?? [];
  const selectedDayEntries = entries.filter(entry => entryOccursOnDate(entry, selectedDay));
  const tasks = data.items.filter(item => item.type === "task" && !item.completed && item.dueDate && item.dueDate >= todayKey)
    .sort((a, b) => (a.type === "task" ? a.dueDate ?? "" : "").localeCompare(b.type === "task" ? b.dueDate ?? "" : ""));
  const undatedTasks = data.items.filter(item => item.type === "task" && !item.completed && !item.dueDate);
  const monthEvents = entries.filter(entry => entry.type === "occasion" || entry.type === "event")
    .map(entry => ({ entry, date: entryOccursOnDate(entry, today) ? todayKey : entry.yearly ? nextOccurrence(entry, today) : entry.date }))
    .filter(value => value.date >= todayKey && value.date.slice(0, 7) === todayKey.slice(0, 7))
    .sort((a, b) => a.date.localeCompare(b.date));
  const onThisDay = entries.filter(entry => (entry.type === "memory" || entry.type === "journal") && entry.date < todayKey && entry.date.slice(5) === todayKey.slice(5));
  const pinned = data.items.filter(item => item.pinned);

  return <div className="space-y-9">
    <DayDial data={data} spaces={spaces} selectedDate={selectedDate} onSelectDate={onSelectDate} onOpenCalendar={onOpenCalendar} onSaveCalendarEntry={onSaveCalendarEntry}/>
    <section aria-labelledby="selected-day-content">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 id="selected-day-content" className="font-editorial text-3xl">{dateLabel(selectedDay)}</h2>
        <button type="button" onClick={onOpenCalendar} className="min-h-11 px-2 text-sm underline underline-offset-4">Open this day in Calendar</button>
      </div>
      {selectedDayItems.length || selectedDayEntries.length ? <ul className="space-y-2">
        {selectedDayItems.map(item => <li key={item.id}><button type="button" onClick={() => onOpenItem(item)} className="flex min-h-14 w-full items-center gap-3 rounded-md border line-border surface px-3 text-left"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: spaces.find(space => space.id === item.spaceId)?.accent ?? "#827a6e" }}/><span className="min-w-0 flex-1 truncate">{item.title}</span><span className="shrink-0 text-xs text-stone-500">{item.completed ? "Done" : "Task"}</span></button></li>)}
        {selectedDayEntries.map(entry => <li key={entry.id}><button type="button" onClick={onOpenCalendar} className="flex min-h-14 w-full items-center gap-3 rounded-md border line-border surface px-3 text-left"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: spaces.find(space => space.id === entry.spaceId)?.accent ?? "#827a6e" }}/><span className="min-w-0 flex-1 truncate">{entry.title || entry.body || "Remember this day"}</span><span className="shrink-0 text-xs capitalize text-stone-500">{entry.type}</span></button></li>)}
      </ul> : <p className="rounded-md border border-dashed line-border p-5 text-sm text-stone-500">Nothing dated for this day yet. Let the day unfold.</p>}
    </section>
    <section aria-labelledby="upcoming-tasks"><h2 id="upcoming-tasks" className="mb-3 font-editorial text-3xl">Today and coming up</h2>
      {tasks.length || undatedTasks.length ? <ul className="grid gap-2 sm:grid-cols-2">{[...tasks.slice(0, 8), ...undatedTasks.slice(0, 3)].map(item => <li key={item.id}><button type="button" onClick={() => onOpenItem(item)} className="flex min-h-14 w-full items-center gap-3 rounded-md border line-border surface px-3 text-left"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: spaces.find(space => space.id === item.spaceId)?.accent ?? "#827a6e" }}/><span className="min-w-0 flex-1 truncate">{item.title}</span><span className="shrink-0 text-xs text-stone-500">{item.type === "task" ? item.dueDate ?? "No date" : ""}</span></button></li>)}</ul> : <p className="rounded-md border border-dashed line-border p-5 text-sm text-stone-500">Nothing pressing. Let the day unfold.</p>}
    </section>
    <section id="close-at-hand" aria-labelledby="close-at-hand-title"><div className="mb-3"><h2 id="close-at-hand-title" className="font-editorial text-3xl">Close at Hand</h2><p className="text-sm text-stone-500">The important things you&apos;ve pinned and want nearby.</p></div>
      {pinned.length ? <ul className="grid gap-3 sm:grid-cols-2">{pinned.map(item => <li key={item.id} className="rounded-md border line-border surface p-4"><button type="button" onClick={() => onOpenItem(item)} className="w-full text-left"><span className="block truncate font-editorial text-2xl">{item.title}</span></button><button type="button" onClick={() => onOpenSpace(item.spaceId)} className="mt-1 min-h-11 text-sm text-stone-500 underline underline-offset-4">{spaces.find(space => space.id === item.spaceId)?.name ?? "Open Space"}</button></li>)}</ul> : <p className="rounded-md border border-dashed line-border p-5 text-sm text-stone-500">Pin something useful to keep it close at hand.</p>}
    </section>
    {monthEvents.length > 0 && <section aria-labelledby="remembering"><div className="mb-3 flex items-center justify-between"><div><h2 id="remembering" className="font-editorial text-3xl">Worth Remembering</h2><p className="text-sm text-stone-500">{dateLabel(today, { month: "long", year: "numeric" })}</p></div><button type="button" onClick={() => { onSelectDate(todayKey); onOpenCalendar(); }} className="min-h-11 px-2 text-sm underline underline-offset-4">Full month</button></div>
      <ul className="space-y-2">{monthEvents.map(({ entry, date }) => <li key={entry.id}><button type="button" onClick={() => { onSelectDate(date); onOpenCalendar(); }} className="flex min-h-14 w-full items-center gap-3 rounded-md border line-border surface px-3 text-left"><span className="w-20 shrink-0 text-xs text-stone-500">{dateLabel(parseLocalDate(date), { month: "short", day: "numeric" })}</span><span className="truncate">{entry.title || entry.body || "Remember this day"}</span></button></li>)}</ul>
    </section>}
    {onThisDay.length > 0 && <section aria-labelledby="on-this-day"><h2 id="on-this-day" className="mb-3 font-editorial text-3xl">On This Day</h2><ul className="grid gap-3 sm:grid-cols-2">{onThisDay.map(entry => <li key={entry.id} className="rounded-md border line-border surface p-4"><p className="text-xs text-stone-500">{entry.date.slice(0, 4)}</p><p className="mt-1 font-editorial text-xl">{entry.title || entry.body || "A little memory"}</p></li>)}</ul></section>}
    {children}
  </div>;
}

function nextOccurrence(entry: CalendarEntry, from: Date) {
  const [year, month, day] = entry.date.split("-").map(Number);
  for (let offset = 0; offset <= 1; offset++) {
    const targetYear = from.getFullYear() + offset;
    const date = `${targetYear}-${String(month).padStart(2, "0")}-${String(month === 2 && day === 29 && !isLeapYear(targetYear) ? 28 : day).padStart(2, "0")}`;
    if (date >= localDateKey(from)) return date;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isLeapYear(year: number) { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }
