import { AppData, ContentItem, Space } from "@/lib/models";

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string";
const boolean = (value: unknown): value is boolean => typeof value === "boolean";

export function isAppData(value: unknown): value is AppData {
  if (!record(value) || !Array.isArray(value.spaces) || !Array.isArray(value.items)) return false;
  return value.spaces.every(isSpace) && value.items.every(isItem);
}

function isSpace(value: unknown): value is Space {
  return record(value) && string(value.id) && (value.ownerId === null || string(value.ownerId)) && string(value.name) && string(value.description) && typeof value.icon === "string" && ["home", "book", "palette", "heart", "briefcase", "leaf"].includes(value.icon) && string(value.accent) && boolean(value.archived) && typeof value.sortOrder === "number" && string(value.createdAt) && string(value.updatedAt);
}

function isItem(value: unknown): value is ContentItem {
  if (!record(value) || !string(value.id) || (value.ownerId !== null && !string(value.ownerId)) || !string(value.spaceId) || !string(value.title) || !boolean(value.pinned) || !string(value.createdAt) || !string(value.updatedAt)) return false;
  if (value.type === "task") return boolean(value.completed) && (value.priority === "low" || value.priority === "medium" || value.priority === "high") && (value.description === undefined || string(value.description)) && (value.dueDate === undefined || string(value.dueDate));
  if (value.type === "note") return string(value.body);
  if (value.type === "list") return Array.isArray(value.entries) && value.entries.every(entry => record(entry) && string(entry.id) && string(entry.text) && boolean(entry.checked));
  if (value.type === "link") return string(value.url);
  return false;
}
