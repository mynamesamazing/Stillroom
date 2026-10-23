"use client";

import React from "react";
import { addDays, dateLabel, entryOccursOnDate, localDateKey, parseLocalDate } from "@/lib/dates";
import { AppData, Space } from "@/lib/models";

export function DayDial({ data, spaces, selectedDate, onSelectDate, onOpenCalendar }: {
  data: AppData;
  spaces: Space[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenCalendar: () => void;
}) {
  const todayKey = localDateKey(new Date());
  const selectedDay = parseLocalDate(selectedDate);
  const weekStart = addDays(selectedDay, -((selectedDay.getDay() + 6) % 7));
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const entries = data.calendarEntries ?? [];

  return <section aria-labelledby="day-dial-title">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <h2 id="day-dial-title" className="font-editorial text-3xl">Day Dial</h2>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous week" onClick={() => onSelectDate(localDateKey(addDays(selectedDay, -7)))} className="grid h-11 w-11 place-items-center rounded-md border line-border">‹</button>
          <button type="button" aria-label="Next week" onClick={() => onSelectDate(localDateKey(addDays(selectedDay, 7)))} className="grid h-11 w-11 place-items-center rounded-md border line-border">›</button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onSelectDate(todayKey)} aria-current={selectedDate === todayKey ? "date" : undefined} className="min-h-11 px-2 text-sm underline underline-offset-4">Today</button>
        <button type="button" onClick={onOpenCalendar} className="min-h-11 px-2 text-sm underline underline-offset-4">Open calendar</button>
      </div>
    </div>
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Choose a day">
      <div className="flex min-w-max gap-2 sm:grid sm:min-w-0 sm:grid-cols-7">
        {dates.map(date => {
          const key = localDateKey(date);
          const dayItems = data.items.filter(item => item.type === "task" && item.dueDate === key);
          const dayEntries = entries.filter(entry => entryOccursOnDate(entry, date));
          const spaceIds = [...dayItems.map(item => item.spaceId), ...dayEntries.map(entry => entry.spaceId)];
          return <button type="button" key={key} onClick={() => onSelectDate(key)} aria-label={dateLabel(date)} aria-pressed={key === selectedDate} className={`min-h-24 w-[4.25rem] shrink-0 rounded-md border p-2 text-center transition-colors sm:w-auto sm:min-w-0 ${key === selectedDate ? "border-stone-500 surface ring-1 ring-stone-500" : "line-border"}`}>
            <span className="block text-[0.65rem] uppercase text-stone-500 sm:text-xs">{dateLabel(date, { weekday: "short" })}</span>
            <span className="mt-1 block font-editorial text-xl sm:text-2xl">{date.getDate()}</span>
            <span className="mt-2 flex min-h-2 justify-center gap-1">{spaceIds.slice(0, 4).map((spaceId, index) => <i key={`${key}-${index}`} aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: spaces.find(space => space.id === spaceId)?.accent ?? "#827a6e" }}/>)}</span>
          </button>;
        })}
      </div>
    </div>
  </section>;
}
