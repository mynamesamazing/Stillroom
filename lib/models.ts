export type SpaceIcon = "home" | "book" | "palette" | "heart" | "briefcase" | "leaf";
export type ItemType = "task" | "note" | "list" | "link";
export type Priority = "low" | "medium" | "high";

export interface Space {
  id: string;
  ownerId: string | null;
  name: string;
  description: string;
  icon: SpaceIcon;
  accent: string;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListEntry {
  id: string;
  text: string;
  checked: boolean;
}

export interface BaseItem {
  id: string;
  ownerId: string | null;
  spaceId: string;
  type: ItemType;
  title: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem extends BaseItem { type: "task"; description?: string; dueDate?: string; completed: boolean; priority: Priority }
export interface NoteItem extends BaseItem { type: "note"; body: string }
export interface ListItem extends BaseItem { type: "list"; entries: ListEntry[] }
export interface LinkItem extends BaseItem { type: "link"; url: string }
export type ContentItem = TaskItem | NoteItem | ListItem | LinkItem;

export interface AppData { spaces: Space[]; items: ContentItem[] }

export const now = () => new Date().toISOString();
export const createId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
