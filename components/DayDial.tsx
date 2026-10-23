"use client";

import React, { useEffect, useState } from "react";
import { addDays, dateLabel, entryOccursOnDate, localDateKey, parseLocalDate } from "@/lib/dates";
import {
  cityLocation,
  DAY_DIAL_CITIES,
  DAY_DIAL_LOCATION_STORAGE_KEY,
  DEFAULT_CITY_ID,
  DayDialLocation,
  DayDialLocationPreference,
  loadDayDialPreference,
  saveDayDialPreference,
} from "@/lib/dayDialLocation";
import { calculateSolarDay, formatSolarTime, SolarDay } from "@/lib/solar";
import { AppData, CalendarEntry, Space } from "@/lib/models";

const dialCenter = 200;
const eventRadius = 108;
const fallbackLocation: DayDialLocation = {
  name: "London, United Kingdom",
  latitude: 51.5072,
  longitude: -0.1276,
  timeZone: "Europe/London",
  source: "city",
};

function pointAt(hour: number, radius: number) {
  const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
  return {
    x: dialCenter + Math.cos(angle) * radius,
    y: dialCenter + Math.sin(angle) * radius,
  };
}

function arcPath(startHour: number, endHour: number, radius: number) {
  if (endHour <= startHour) return "";
  const segments = Math.ceil((endHour - startHour) / 12);
  const segmentLength = (endHour - startHour) / segments;
  return Array.from({ length: segments }, (_, index) => {
    const start = pointAt(startHour + index * segmentLength, radius);
    const end = pointAt(startHour + (index + 1) * segmentLength, radius);
    return `${index === 0 ? `M ${start.x} ${start.y}` : ""} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
  }).join(" ");
}

function entryMinutes(entry: CalendarEntry) {
  const match = entry.time?.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatClockTime(minutes: number) {
  const rounded = (Math.round(minutes) + 1440) % 1440;
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

function locationForPreference(preference: DayDialLocationPreference): DayDialLocation | null {
  if (preference.kind === "city") return cityLocation(preference.cityId);
  return {
    name: "Your device location",
    latitude: preference.latitude,
    longitude: preference.longitude,
    timeZone: preference.timeZone,
    source: "device",
  };
}

function dialMinuteFromPointer(event: React.PointerEvent<SVGCircleElement>) {
  const svg = event.currentTarget.ownerSVGElement;
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = (event.clientX - rect.left) * 400 / rect.width - dialCenter;
  const y = (event.clientY - rect.top) * 400 / rect.height - dialCenter;
  const angle = (Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
  return Math.round(angle / (Math.PI * 2) * 1440) % 1440;
}

function solarDayLabel(solar: SolarDay) {
  if (solar.kind === "polar-day") return "Polar day · sun above the horizon all day";
  if (solar.kind === "polar-night") return "Polar night · sun below the horizon all day";
  return `Sunrise ${formatSolarTime(solar.sunrise)} · Sunset ${formatSolarTime(solar.sunset)}`;
}

export interface DayDialProps {
  data: AppData;
  spaces: Space[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenCalendar: () => void;
  onSaveCalendarEntry?: (entry: CalendarEntry) => Promise<boolean>;
}

export function DayDial({ data, spaces, selectedDate, onSelectDate, onOpenCalendar, onSaveCalendarEntry }: DayDialProps) {
  const todayKey = localDateKey(new Date());
  const selectedDay = parseLocalDate(selectedDate);
  const isToday = selectedDate === todayKey;
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [location, setLocation] = useState<DayDialLocation>(fallbackLocation);
  const [locationPreference, setLocationPreference] = useState<DayDialLocationPreference>({ kind: "city", cityId: DEFAULT_CITY_ID });
  const [locationLoaded, setLocationLoaded] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [interactionMessage, setInteractionMessage] = useState("");
  const [dragging, setDragging] = useState<{ id: string; minutes: number } | null>(null);

  const dateText = dateLabel(selectedDay);
  const solar = calculateSolarDay(selectedDate, location);
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const preference = loadDayDialPreference(window.localStorage);
        if (preference) {
          const savedLocation = locationForPreference(preference);
          if (savedLocation) {
            setLocationPreference(preference);
            setLocation(savedLocation);
          } else {
            setLocationMessage("The saved location is unavailable. Using the clearly labeled London fallback.");
          }
        } else if (window.localStorage.getItem(DAY_DIAL_LOCATION_STORAGE_KEY) !== null) {
          setLocationMessage("The saved location could not be read. Using the clearly labeled London fallback.");
        }
      } catch {
        setLocationMessage("Browser storage is unavailable. Using the clearly labeled London fallback; your location preference cannot be saved.");
      } finally {
        setLocationLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const persistLocation = (preference: DayDialLocationPreference, nextLocation: DayDialLocation) => {
    setLocation(preference.kind === "city"
      ? { ...nextLocation, source: "city" }
      : { ...nextLocation, source: "device" });
    setLocationPreference(preference);
    setLocationMessage("");
    try {
      saveDayDialPreference(window.localStorage, preference);
    } catch {
      setLocationMessage("This location will be used until you leave Stillroom, but browser storage could not save the preference.");
    }
  };

  const chooseCity = (cityId: string) => {
    const nextLocation = cityLocation(cityId);
    if (!nextLocation) {
      setLocationMessage("That city is not available. Choose a city from the list.");
      return;
    }
    persistLocation({ kind: "city", cityId }, nextLocation);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage(`Location is unavailable in this browser. Using ${location.name} as the selected fallback; choose a city below to change it.`);
      return;
    }
    setRequestingLocation(true);
    setLocationMessage("");
    try {
      navigator.geolocation.getCurrentPosition(position => {
        const preference: DayDialLocationPreference = {
          kind: "device",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        };
        const nextLocation = locationForPreference(preference);
        if (!nextLocation) {
          setLocationMessage(`Your location could not be used. Using ${location.name} as the selected fallback.`);
        } else {
          persistLocation(preference, nextLocation);
          setLocationMessage("Your precise coordinates are stored only in this browser for solar calculations. They are not sent to a server.");
        }
        setRequestingLocation(false);
      }, error => {
        const reason = error.code === error.PERMISSION_DENIED
          ? "Location permission was denied."
          : error.code === error.POSITION_UNAVAILABLE
            ? "Your device could not determine its location."
            : "The location request timed out.";
        setLocationMessage(`${reason} Using ${location.name} as the selected fallback; choose a city below to change it.`);
        setRequestingLocation(false);
      }, { enableHighAccuracy: false, maximumAge: 300_000, timeout: 15_000 });
    } catch {
      setRequestingLocation(false);
      setLocationMessage(`This browser could not start location access. Using ${location.name} as the selected fallback; choose a city below to change it.`);
    }
  };

  const currentMinutes = currentTime && isToday ? currentTime.getHours() * 60 + currentTime.getMinutes() : null;
  const currentPoint = currentMinutes === null ? null : pointAt(currentMinutes / 60, 90);
  const majorHours = Array.from({ length: 8 }, (_, index) => index * 3);
  const majorArcs = solar.kind === "normal"
    ? { daylightStart: solar.sunrise / 60, daylightEnd: solar.sunrise / 60 + solar.dayLength / 60 }
    : null;
  const solarStatus = solarDayLabel(solar);
  const locationKind = location.source === "device" ? "your chosen device location" : location.name === fallbackLocation.name ? "default fallback" : "your chosen city";

  const commitEventTime = async (entry: CalendarEntry, minutes: number) => {
    setDragging(null);
    const nextTime = formatClockTime(minutes);
    if (!onSaveCalendarEntry || entry.time === nextTime) return;
    const currentMinutes = entryMinutes(entry);
    const endMinutes = entryMinutes({ ...entry, time: entry.endTime });
    const nextEndTime = currentMinutes !== null && endMinutes !== null && endMinutes !== currentMinutes
      ? formatClockTime(endMinutes + minutes - currentMinutes)
      : entry.endTime;
    try {
      const saved = await onSaveCalendarEntry({ ...entry, time: nextTime, endTime: nextEndTime, updatedAt: new Date().toISOString() });
      setInteractionMessage(saved ? `${entry.title || "Event"} moved to ${formatSolarTime(minutes)}.` : "The event time could not be saved. Its original time is unchanged.");
    } catch (error) {
      setInteractionMessage(error instanceof Error ? error.message : "The event time could not be saved.");
    }
  };

  const adjustEventTime = (entry: CalendarEntry, minutes: number, delta: number) => {
    const nextMinutes = (minutes + delta + 1440) % 1440;
    void commitEventTime(entry, nextMinutes);
  };

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

    <div className="mx-auto mb-4 max-w-xl rounded-md border line-border surface p-3 sm:p-4">
      <label htmlFor="day-dial-city" className="mb-2 block text-sm font-medium">Sunrise and sunset location</label>
      <div className="flex flex-wrap gap-2">
        <select
          id="day-dial-city"
          value={locationPreference.kind === "city" ? locationPreference.cityId : "device"}
          onChange={event => event.target.value === "device" ? setLocationMessage("Use the button to request your location when you are ready.") : chooseCity(event.target.value)}
          className="h-11 min-w-0 flex-1 rounded-md border line-border bg-transparent px-3 text-sm"
          disabled={!locationLoaded}
        >
          <option value={DEFAULT_CITY_ID}>London, United Kingdom · default fallback</option>
          {locationPreference.kind === "device" && <option value="device">Your device location · saved locally</option>}
          {DAY_DIAL_CITIES.filter(city => city.id !== DEFAULT_CITY_ID).map(city => <option key={city.id} value={city.id}>{city.name}, {city.region}</option>)}
        </select>
        <button type="button" onClick={useMyLocation} disabled={requestingLocation} className="min-h-11 rounded-md border line-border px-3 text-sm disabled:opacity-50">
          {requestingLocation ? "Finding location…" : "Use my location"}
        </button>
      </div>
      <p className="mt-2 text-xs text-stone-500">Using {locationKind}: {location.name}{location.source === "device" ? ` · ${location.timeZone}` : ""}</p>
      <details className="mt-2 text-xs text-stone-500">
        <summary className="min-h-11 cursor-pointer py-3 underline underline-offset-4">How location and privacy work</summary>
        <p className="pb-2">Your location is requested only when you choose “Use my location.” The selected city or precise device coordinates and time zone are saved in this browser only and used for on-device solar calculations. Stillroom does not send coordinates to a remote API. Browser storage is not encrypted and clearing site data removes this preference. Without permission, London is the clearly labeled fallback; you can choose another city instead.</p>
      </details>
      {locationMessage && <p className="mt-2 break-words text-sm text-stone-500" role="status">{locationMessage}</p>}
    </div>

    <p className="mb-1 text-center font-editorial text-2xl" aria-live="polite">{dateText}</p>
    <p className="mb-2 text-center text-sm text-stone-500">{solarStatus}</p>
    <div className="mx-auto w-full max-w-[24rem]">
      <svg viewBox="0 0 400 400" role="group" aria-label={`12-hour AM and PM Day Dial for ${dateText}`} aria-describedby="day-dial-face-description" className="block h-auto w-full">
        <title>12-hour Day Dial for {dateText}</title>
        <desc id="day-dial-face-description">24 hourly positions are shown on a 12-hour face. Midnight is at the top, 6 AM at the right, noon at the bottom, and 6 PM at the left. {location.name}. {solarStatus} {timedEntries.length} timed events are marked and can be adjusted from the dial.</desc>
        <circle cx={dialCenter} cy={dialCenter} r="184" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="1.5"/>
        {solar.kind === "polar-night"
          ? <path d={arcPath(0, 24, 132)} fill="none" stroke="rgb(var(--muted))" strokeWidth="9" opacity=".34" strokeLinecap="round"/>
          : solar.kind === "polar-day"
            ? <path d={arcPath(0, 24, 132)} fill="none" stroke="#B69056" strokeWidth="9" opacity=".6" strokeLinecap="round"/>
            : majorArcs && <>
              <path d={arcPath(majorArcs.daylightEnd, majorArcs.daylightStart + 24, 132)} fill="none" stroke="rgb(var(--muted))" strokeWidth="9" opacity=".28" strokeLinecap="round" data-arc="night"/>
              <path d={arcPath(majorArcs.daylightStart, majorArcs.daylightEnd, 132)} fill="none" stroke="#B69056" strokeWidth="9" opacity=".62" strokeLinecap="round" data-arc="daylight"/>
            </>}
        {Array.from({ length: 24 }, (_, hour) => {
          const tickStart = pointAt(hour, 167);
          const tickEnd = pointAt(hour, 178);
          return <line key={hour} x1={tickStart.x} y1={tickStart.y} x2={tickEnd.x} y2={tickEnd.y} stroke="rgb(var(--muted))" strokeWidth={hour % 3 === 0 ? "2" : "1"} data-hour-marker={hour}/>;
        })}
        {majorHours.map(hour => {
          const label = pointAt(hour, 150);
          const clockHour = hour % 12 || 12;
          const suffix = hour < 12 ? "AM" : "PM";
          return <text key={hour} x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central" fill="rgb(var(--foreground))" fontSize="11" fontWeight="600" data-hour-label={hour}>
            {clockHour} {suffix}
          </text>;
        })}
        <text x="288" y="275" textAnchor="middle" fill="rgb(var(--muted))" fontSize="10" fontWeight="600" letterSpacing="1">AM</text>
        <text x="112" y="275" textAnchor="middle" fill="rgb(var(--muted))" fontSize="10" fontWeight="600" letterSpacing="1">PM</text>
        {solar.kind === "normal" && <>
          <g aria-label={`Sunrise at ${formatSolarTime(solar.sunrise)}`}>
            <line x1={pointAt(solar.sunrise / 60, 126).x} y1={pointAt(solar.sunrise / 60, 126).y} x2={pointAt(solar.sunrise / 60, 144).x} y2={pointAt(solar.sunrise / 60, 144).y} stroke="#9B6849" strokeWidth="2.5" data-solar-marker="sunrise"/>
            <title>Sunrise {formatSolarTime(solar.sunrise)}</title>
          </g>
          <g aria-label={`Sunset at ${formatSolarTime(solar.sunset)}`}>
            <line x1={pointAt(solar.sunset / 60, 126).x} y1={pointAt(solar.sunset / 60, 126).y} x2={pointAt(solar.sunset / 60, 144).x} y2={pointAt(solar.sunset / 60, 144).y} stroke="#9B6849" strokeWidth="2.5" data-solar-marker="sunset"/>
            <title>Sunset {formatSolarTime(solar.sunset)}</title>
          </g>
        </>}
        {timedEntries.map(({ entry, minutes }, index) => {
          const displayMinutes = dragging?.id === entry.id ? dragging.minutes : minutes;
          const sameTimeIndex = timedEntries.slice(0, index).filter(item => item.minutes === displayMinutes).length;
          const sameTimeCount = timedEntries.filter(item => item.minutes === displayMinutes).length;
          const radius = eventRadius + (sameTimeIndex - (sameTimeCount - 1) / 2) * 9;
          const point = pointAt(displayMinutes / 60, radius);
          const color = spaceById.get(entry.spaceId ?? "")?.accent ?? "#827a6e";
          const endMinutes = entryMinutes({ ...entry, time: entry.endTime });
          const arcEnd = endMinutes === null || endMinutes === displayMinutes ? null : endMinutes < displayMinutes ? endMinutes + 1440 : endMinutes;
          const accessibleTitle = entry.title || entry.body || "Calendar event";
          const ariaValueText = `${formatSolarTime(displayMinutes)}, ${accessibleTitle}${arcEnd !== null ? `, until ${formatSolarTime(endMinutes ?? displayMinutes)}` : ""}`;
          const startPointerDrag = (event: React.PointerEvent<SVGCircleElement>) => {
            if (!onSaveCalendarEntry) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture?.(event.pointerId);
            setDragging({ id: entry.id, minutes: displayMinutes });
          };
          return <g key={entry.id}>
            {arcEnd !== null && <path d={arcPath(displayMinutes / 60, arcEnd / 60, eventRadius)} fill="none" stroke={color} strokeWidth="7" opacity=".5" strokeLinecap="round" data-event-arc={entry.id}/>}
            <circle
              cx={point.x}
              cy={point.y}
              r="26"
              fill="transparent"
              role="slider"
              tabIndex={onSaveCalendarEntry ? 0 : -1}
              aria-label={`${accessibleTitle} start time`}
              aria-valuemin={0}
              aria-valuemax={1439}
              aria-valuenow={displayMinutes}
              aria-valuetext={ariaValueText}
              aria-describedby="day-dial-adjust-help"
              aria-disabled={!onSaveCalendarEntry}
              onPointerDown={startPointerDrag}
              onPointerMove={event => {
                if (dragging?.id !== entry.id) return;
                const nextMinutes = dialMinuteFromPointer(event);
                if (nextMinutes !== null) setDragging({ id: entry.id, minutes: nextMinutes });
              }}
              onPointerUp={event => {
                if (dragging?.id !== entry.id) return;
                const nextMinutes = dialMinuteFromPointer(event) ?? dragging.minutes;
                void commitEventTime(entry, nextMinutes);
              }}
              onPointerCancel={() => setDragging(null)}
              onKeyDown={event => {
                const delta = event.key === "ArrowRight" || event.key === "ArrowUp" ? 15
                  : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -15
                    : event.key === "PageUp" ? 60
                      : event.key === "PageDown" ? -60 : 0;
                if (delta) {
                  event.preventDefault();
                  adjustEventTime(entry, displayMinutes, delta);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  void commitEventTime(entry, 0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  void commitEventTime(entry, 1439);
                }
              }}
              className={onSaveCalendarEntry ? "cursor-grab touch-none focus:fill-stone-500/20 focus:outline-none active:cursor-grabbing" : ""}
              data-event-time={formatClockTime(displayMinutes)}
              data-event-marker={entry.id}
            />
            <circle cx={point.x} cy={point.y} r="5.5" fill={color} stroke="rgb(var(--surface))" strokeWidth="2" aria-hidden="true" pointerEvents="none"/>
            <title>{ariaValueText}</title>
          </g>;
        })}
        {currentPoint && <g aria-label={`Current time, ${currentTime?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}>
          <line x1={dialCenter} y1={dialCenter} x2={currentPoint.x} y2={currentPoint.y} stroke="rgb(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" opacity=".65" data-current-time="true"/>
          <circle cx={currentPoint.x} cy={currentPoint.y} r="3.5" fill="rgb(var(--foreground))"/>
          <circle cx={dialCenter} cy={dialCenter} r="4" fill="rgb(var(--foreground))"/>
        </g>}
        <circle cx={dialCenter} cy={dialCenter} r="76" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="1"/>
        <text x={dialCenter} y="190" textAnchor="middle" fill="rgb(var(--foreground))" fontFamily="var(--font-cormorant), serif" fontSize="24">{selectedDay.getDate()}</text>
        <text x={dialCenter} y="212" textAnchor="middle" fill="rgb(var(--muted))" fontSize="10" letterSpacing="1">{selectedDay.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}</text>
        {!timedEntries.length && <text x={dialCenter} y="234" textAnchor="middle" fill="rgb(var(--muted))" fontSize="9">A little room to breathe</text>}
      </svg>
      <p id="day-dial-adjust-help" className="sr-only">Drag an event marker to adjust its exact time. Keyboard users can press the arrow keys to move it by 15 minutes, Page Up or Page Down by one hour, Home for midnight, and End for 11:59 PM.</p>
      {isToday && currentTime && <p className="mt-1 text-center text-xs text-stone-500" aria-label={`Current time: ${currentTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}>Now · {currentTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</p>}
    </div>
    <p className="mx-auto mt-2 max-w-xl text-center text-xs text-stone-500">Daylight is shown in gold; night is muted. Event dots and any saved time-block arcs are adjustable by touch or keyboard.</p>

    <div className="mx-auto mt-5 max-w-2xl">
      <h3 className="mb-2 font-editorial text-xl">The day, in time</h3>
      {entries.length ? <ol aria-label={`Events for ${dateText}`} className="divide-y line-border">
        {entries.map(({ entry, minutes }) => {
          const color = spaceById.get(entry.spaceId ?? "")?.accent ?? "#827a6e";
          const title = entry.title || entry.body || "Remember this day";
          const displayMinutes = dragging?.id === entry.id ? dragging.minutes : minutes;
          const endMinutes = entryMinutes({ ...entry, time: entry.endTime });
          return <li key={entry.id} className="flex min-h-14 items-start gap-3 py-3">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true"/>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{title}</p>
              {entry.location && <p className="text-sm text-stone-500">{entry.location}</p>}
            </div>
            {minutes === null
              ? <span className="shrink-0 text-sm text-stone-500">All day</span>
              : <time className="shrink-0 text-sm tabular-nums text-stone-500" dateTime={`${selectedDate}T${formatClockTime(displayMinutes ?? minutes)}`}>
                {formatSolarTime(displayMinutes ?? minutes)}{endMinutes !== null ? ` – ${formatSolarTime(endMinutes)}` : ""}
              </time>}
          </li>;
        })}
      </ol> : <p className="rounded-md border border-dashed line-border p-4 text-sm text-stone-500">No timed plans for this day. There&apos;s room for whatever comes.</p>}
      {interactionMessage && <p role="status" className="mt-3 rounded-md border border-dashed line-border p-3 text-sm text-stone-500">{interactionMessage}</p>}
    </div>
  </section>;
}
