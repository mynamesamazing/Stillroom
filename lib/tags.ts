import { Tag } from "./models";

export const suggestedTags: Tag[] = [
  { id: "suggested-gift-idea", name: "Gift idea" },
  { id: "suggested-to-do", name: "To do" },
  { id: "suggested-shopping", name: "Shopping" },
  { id: "suggested-reference", name: "Reference" },
  { id: "suggested-inspiration", name: "Inspiration" },
  { id: "suggested-read-later", name: "Read later" },
];

export const normalizeTagName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

export function normalizeTagRegistry(tags: Tag[]) {
  const normalized: Tag[] = [];
  const byName = new Map<string, Tag>();
  const idMap = new Map<string, string>();
  for (const tag of tags) {
    const name = tag.name.trim().replace(/\s+/g, " ");
    const key = normalizeTagName(name);
    if (!key) continue;
    const existing = byName.get(key);
    if (existing) {
      idMap.set(tag.id, existing.id);
      continue;
    }
    const normalizedTag = { ...tag, name };
    normalized.push(normalizedTag);
    byName.set(key, normalizedTag);
    idMap.set(tag.id, tag.id);
  }
  return { tags: normalized, idMap };
}
