"use client";

import React, { useEffect, useState } from "react";
import { addDays, dateLabel, entryOccursOnDate, localDateKey, parseLocalDate } from "@/lib/dates";
import { AppData, CalendarEntry, Space } from "@/lib/models";

const dialCenter = 200;
const eventRadius = 112;

function pointAt(hour: number, radius: number) {
  const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
  return {
    x: dialCenter + Math.cos(angle) * radius,
    y: dialCenter + Math.sin(angle) * radius,
  };
}

function entryMinutes(entry: CalendarEntry) {
  const match = entry.time?.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export interface DayDialProps {
  data: AppData;
  spaces: Space[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenCalendar: () => void;
}

export function DayDial({ data, spaces, selectedDate, onSelectDate, onOpenCalendar }: DayDialProps) {
  const todayKey = localDateKey(new Date());
  const selectedDay = parseLocalDate(selectedDate);
  const isToday = selectedDate === todayKey;
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const entries = (data.calendarEntries ?? [])
    .filter(entry => entryOccursOnDate(entry, selectedDay))
    .map(entry => ({ entry, minutes: entryMinutes(entry) }))
    .sort((a, b) => (a.minutes ?? Number.POSITIVE_INFINITY) - (b.minutes ?? Number.POSITIVE_INFINITY));
  const timedEntries = entries.filter((item): item is typeof item & { minutes: number } => item.minutes !== null);
  const spaceById = new Map(spaces.map(space => [space.id, space]));

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(new Date());
    updateCurrentTime();
    const interval = window.setInterval(updateCurrentTime, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const currentMinutes = currentTime && isToday ? currentTime.getHours() * 60 + currentTime.getMinutes() : null;
  const currentPoint = currentMinutes === null ? null : pointAt(currentMinutes / 60, 104);
  const dateText = dateLabel(selectedDay);
  const hourLabel = currentTime?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return <section aria-labelledby="day-dial-title">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <h2 id="day-dial-title" className="font-editorial text-3xl">Day Dial</h2>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous day" onClick={() => onSelectDate(localDateKey(addDays(selectedDay, -1)))} className="grid h-11 w-11 place-items-center rounded-md border line-border" aria-keyshortcuts="ArrowLeft">‹</button>
          <button type="button" aria-label="Next day" onClick={() => onSelectDate(localDateKey(addDays(selectedDay, 1)))} className="grid h-11 w-11 place-items-center rounded-md border line-border" aria-keyshortcuts="ArrowRight">›</button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onSelectDate(todayKey)} aria-current={isToday ? "date" : undefined} className="min-h-11 px-2 text-sm underline underline-offset-4">Today</button>
        <button type="button" onClick={onOpenCalendar} className="min-h-11 px-2 text-sm underline underline-offset-4">Open calendar</button>
      </div>
    </div>

    <p className="mb-2 text-center font-editorial text-2xl" aria-live="polite">{dateText}</p>
    <div className="mx-auto w-full max-w-[24rem]">
      <svg viewBox="0 0 400 400" role="img" aria-labelledby="day-dial-face-title day-dial-face-description" className="block h-auto w-full overflow-visible">
        <title id="day-dial-face-title">24-hour Day Dial for {dateText}</title>
        <desc id="day-dial-face-description">Midnight is at the top, 6 AM at the right, noon at the bottom, and 6 PM at the left. {timedEntries.length} timed {timedEntries.length === 1 ? "event" : "events"} are marked on the dial.</desc>
        <circle cx={dialCenter} cy={dialCenter} r="184" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="1.5"/>
        {Array.from({ length: 24 }, (_, hour) => {
          const tickStart = pointAt(hour, 170);
          const tickEnd = pointAt(hour, 179);
          const label = pointAt(hour, 150);
          return <g key={hour}>
            <line x1={tickStart.x} y1={tickStart.y} x2={tickEnd.x} y2={tickEnd.y} stroke="rgb(var(--muted))" strokeWidth={hour % 6 === 0 ? "2" : "1"}/>
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central" fill="rgb(var(--muted))" fontSize={hour % 6 === 0 ? "12" : "10"} fontWeight={hour % 6 === 0 ? "600" : "400"} data-hour-label={hour}>
              {String(hour).padStart(2, "0")}
            </text>
          </g>;
        })}
        <circle cx={dialCenter} cy={dialCenter} r="2" fill="rgb(var(--line))"/>
        {timedEntries.map(({ entry, minutes }, index) => {
          const sameTimeIndex = timedEntries.slice(0, index).filter(item => item.minutes === minutes).length;
          const sameTimeCount = timedEntries.filter(item => item.minutes === minutes).length;
          const radius = eventRadius + (sameTimeIndex - (sameTimeCount - 1) / 2) * 9;
          const point = pointAt(minutes / 60, radius);
          const color = spaceById.get(entry.spaceId ?? "")?.accent ?? "#827a6e";
          return <circle key={entry.id} cx={point.x} cy={point.y} r="6" fill={color} stroke="rgb(var(--surface))" strokeWidth="2" data-event-time={entry.time} aria-hidden="true"/>;
        })}
        {currentPoint && <g aria-label={`Current time, ${hourLabel}`}>
          <line x1={dialCenter} y1={dialCenter} x2={currentPoint.x} y2={currentPoint.y} stroke="rgb(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" opacity=".65" data-current-time="true"/>
          <circle cx={currentPoint.x} cy={currentPoint.y} r="3.5" fill="rgb(var(--foreground))"/>
          <circle cx={dialCenter} cy={dialCenter} r="4" fill="rgb(var(--foreground))"/>
        </g>}
        <circle cx={dialCenter} cy={dialCenter} r="77" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="1"/>
        <text x={dialCenter} y="190" textAnchor="middle" fill="rgb(var(--foreground))" fontFamily="var(--font-cormorant), serif" fontSize="24">{selectedDay.getDate()}</text>
        <text x={dialCenter} y="212" textAnchor="middle" fill="rgb(var(--muted))" fontSize="10" letterSpacing="1">{selectedDay.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}</text>
        {!timedEntries.length && <text x={dialCenter} y="234" textAnchor="middle" fill="rgb(var(--muted))" fontSize="9">A little room to breathe</text>}
      </svg>
      {isToday && currentTime && <p className="mt-1 text-center text-xs text-stone-500" aria-label={`Current time: ${hourLabel}`}>Now · {hourLabel}</p>}
    </div>

    <div className="mx-auto mt-5 max-w-2xl">
      <h3 className="mb-2 font-editorial text-xl">The day, in time</h3>
      {entries.length ? <ol aria-label={`Events for ${dateText}`} className="divide-y line-border">
        {entries.map(({ entry, minutes }) => {
          const color = spaceById.get(entry.spaceId ?? "")?.accent ?? "#827a6e";
          const title = entry.title || entry.body || "Remember this day";
          return <li key={entry.id} className="flex min-h-14 items-start gap-3 py-3">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true"/>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{title}</p>
              {entry.location && <p className="text-sm text-stone-500">{entry.location}</p>}
            </div>
            {minutes === null
              ? <span className="shrink-0 text-sm text-stone-500">All day</span>
              : <time className="shrink-0 text-sm tabular-nums text-stone-500" dateTime={`${selectedDate}T${entry.time}`}>{entry.time}</time>}
          </li>;
        })}
      </ol> : <p className="rounded-md border border-dashed line-border p-4 text-sm text-stone-500">No timed plans for this day. There&apos;s room for whatever comes.</p>}
    </div>
  </section>;
}
