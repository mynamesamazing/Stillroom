import { AppData, ContentItem, Space } from "@/lib/models";
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
  return value.spaces.every(isSpace) && value.items.every(isItem);
}

export function normalizeAppData(value: AppData): AppData {
  const { tags, idMap } = normalizeTagRegistry(value.tags ?? []);
  const knownTags = new Set(tags.map(tag => tag.id));
  const items = value.items.map(item => {
    const tagIds = item.tagIds === undefined ? undefined : [...new Set(item.tagIds.map(id => idMap.get(id)).filter((id): id is string => Boolean(id && knownTags.has(id))))];
    if (item.type === "link") return { ...item, notes: item.notes ?? "", tagIds: tagIds ?? [] };
    return tagIds ? { ...item, tagIds } : item;
  });
  return { ...value, spaces: value.spaces, items, tags };
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
