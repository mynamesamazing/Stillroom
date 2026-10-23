import { AppData, CalendarEntry, ContentItem, DayPortrait, Mood, Space } from "@/lib/models";
import { normalizeTagRegistry } from "@/lib/tags";

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string";
const boolean = (value: unknown): value is boolean => typeof value === "boolean";

export function isAppData(value: unknown): value is AppData {
  if (!record(value) || !Array.isArray(value.spaces) || !Array.isArray(value.items)) return false;
  if (value.tags !== undefined && (!Array.isArray(value.tags) || !value.tags.every(isTag))) return false;
  if (Array.isArray(value.tags)) {
    const ids = value.tags.map(tag => tag.id);
    if (new Set(ids).size !== ids.length) return false;
  }
  return (value.schemaVersion === undefined || value.schemaVersion === 2)
    && (value.calendarEntries === undefined || (Array.isArray(value.calendarEntries) && value.calendarEntries.every(isCalendarEntry)))
    && (value.dayPortraits === undefined || (Array.isArray(value.dayPortraits) && value.dayPortraits.every(isDayPortrait)))
    && (value.captureEntries === undefined || (Array.isArray(value.captureEntries) && value.captureEntries.every(isCaptureEntry)))
    && value.spaces.every(isSpace) && value.items.every(isItem);
}

export function normalizeAppData(value: AppData): AppData {
  const { tags, idMap } = normalizeTagRegistry(value.tags ?? []);
  const knownTags = new Set(tags.map(tag => tag.id));
  const items = value.items.map(item => {
    const tagIds = item.tagIds === undefined ? undefined : [...new Set(item.tagIds.map(id => idMap.get(id)).filter((id): id is string => Boolean(id && knownTags.has(id))))];
    if (item.type === "link") return { ...item, notes: item.notes ?? "", tagIds: tagIds ?? [] };
    return tagIds ? { ...item, tagIds } : item;
  });
  return { ...value, schemaVersion: 2, spaces: value.spaces, items, tags, calendarEntries: value.calendarEntries ?? [], dayPortraits: value.dayPortraits ?? [], captureEntries: value.captureEntries ?? [] };
}

const moods: Mood[] = ["Lovely", "Good", "So-so", "Heavy", "Quiet"];
const validDate = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};
const validTime = (value: unknown) => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const photoIds = (value: unknown) => value === undefined || Array.isArray(value) && value.every(string);
const validMood = (value: unknown) => value === undefined || moods.includes(value as Mood);

function isCalendarEntry(value: unknown): value is CalendarEntry {
  if (!record(value) || !string(value.id) || !validDate(value.date) || !string(value.createdAt) || !string(value.updatedAt)) return false;
  if (value.type !== "journal" && value.type !== "event" && value.type !== "occasion" && value.type !== "memory") return false;
  return (value.title === undefined || string(value.title)) && (value.body === undefined || string(value.body))
    && (value.time === undefined || string(value.time)) && (value.endTime === undefined || value.type === "event" && validTime(value.endTime)) && (value.location === undefined || string(value.location))
    && validMood(value.mood) && photoIds(value.photoIds) && (value.portraitId === undefined || string(value.portraitId)) && (value.spaceId === undefined || string(value.spaceId))
    && (value.yearly === undefined || boolean(value.yearly)) && (value.reminderDays === undefined || typeof value.reminderDays === "number" && value.reminderDays >= 0);
}

function isDayPortrait(value: unknown): value is DayPortrait {
  return record(value) && string(value.id) && validDate(value.date) && validMood(value.mood)
    && (value.caption === undefined || string(value.caption)) && Array.isArray(value.photoIds)
    && value.photoIds.every(string) && string(value.updatedAt);
}

function isCaptureEntry(value: unknown): value is { id: string; text: string; createdAt: string; updatedAt: string } {
  return record(value) && string(value.id) && string(value.text) && value.text.trim().length > 0
    && string(value.createdAt) && string(value.updatedAt);
}

function isTag(value: unknown): value is { id: string; name: string } {
  return record(value) && string(value.id) && value.id.trim().length > 0 && string(value.name) && value.name.trim().length > 0;
}

function isSpace(value: unknown): value is Space {
  return record(value) && string(value.id) && (value.ownerId === null || string(value.ownerId)) && string(value.name) && string(value.description) && typeof value.icon === "string" && ["home", "book", "palette", "heart", "briefcase", "leaf"].includes(value.icon) && string(value.accent) && boolean(value.archived) && typeof value.sortOrder === "number" && string(value.createdAt) && string(value.updatedAt);
}

function isItem(value: unknown): value is ContentItem {
  if (!record(value) || !string(value.id) || (value.ownerId !== null && !string(value.ownerId)) || !string(value.spaceId) || !string(value.title) || !boolean(value.pinned) || !string(value.createdAt) || !string(value.updatedAt)) return false;
  if (value.tagIds !== undefined && (!Array.isArray(value.tagIds) || !value.tagIds.every(string))) return false;
  if (value.type === "task") return boolean(value.completed) && (value.priority === "low" || value.priority === "medium" || value.priority === "high") && (value.description === undefined || string(value.description)) && (value.dueDate === undefined || string(value.dueDate));
  if (value.type === "note") return string(value.body);
  if (value.type === "list") return Array.isArray(value.entries) && value.entries.every(entry => record(entry) && string(entry.id) && string(entry.text) && boolean(entry.checked));
  if (value.type === "link") return string(value.url) && (value.notes === undefined || string(value.notes));
  return false;
}
