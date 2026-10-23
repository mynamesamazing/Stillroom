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

export interface Tag {
  id: string;
  name: string;
}

export type CalendarEntryType = "journal" | "event" | "occasion" | "memory";
export type Mood = "Lovely" | "Good" | "So-so" | "Heavy" | "Quiet";

export interface CalendarEntry {
  id: string;
  type: CalendarEntryType;
  date: string;
  title?: string;
  body?: string;
  time?: string;
  location?: string;
  mood?: Mood;
  photoIds?: string[];
  portraitId?: string;
  spaceId?: string;
  yearly?: boolean;
  reminderDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DayPortrait {
  id: string;
  date: string;
  mood?: Mood;
  caption?: string;
  photoIds: string[];
  updatedAt: string;
}

export interface CaptureEntry {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaseItem {
  id: string;
  ownerId: string | null;
  spaceId: string;
  type: ItemType;
  title: string;
  pinned: boolean;
  tagIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem extends BaseItem { type: "task"; description?: string; dueDate?: string; completed: boolean; priority: Priority }
export interface NoteItem extends BaseItem { type: "note"; body: string }
export interface ListItem extends BaseItem { type: "list"; entries: ListEntry[] }
export interface LinkItem extends BaseItem { type: "link"; url: string; notes?: string }
export type ContentItem = TaskItem | NoteItem | ListItem | LinkItem;

export interface AppData {
  spaces: Space[];
  items: ContentItem[];
  tags?: Tag[];
  schemaVersion?: 2;
  calendarEntries?: CalendarEntry[];
  dayPortraits?: DayPortrait[];
  captureEntries?: CaptureEntry[];
}

export const now = () => new Date().toISOString();
export const createId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
