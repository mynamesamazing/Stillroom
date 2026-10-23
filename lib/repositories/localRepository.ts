import { AppData, ContentItem, Space, createId, now } from "@/lib/models";
import { LoadResult, StillroomRepository } from "./types";
import { isAppData } from "./schema";

export const STORAGE_KEY = "stillroom-data-v1";
export const RECOVERY_KEY = "stillroom-data-v1-recovery";
export const emptyData: AppData = { spaces: [], items: [] };

export const seedData: AppData = {
  spaces: [
    { id: "home", ownerId: null, name: "At Home", description: "Routines, rooms, and the life we tend.", icon: "home", accent: "#9B6849", archived: false, sortOrder: 0, createdAt: "2026-01-01T09:00:00.000Z", updatedAt: "2026-01-01T09:00:00.000Z" },
    { id: "studio", ownerId: null, name: "Studio", description: "Ideas, projects, and work worth making.", icon: "palette", accent: "#5F7257", archived: false, sortOrder: 1, createdAt: "2026-01-01T09:00:00.000Z", updatedAt: "2026-01-01T09:00:00.000Z" },
    { id: "wellbeing", ownerId: null, name: "Wellbeing", description: "Small practices for a steadier life.", icon: "heart", accent: "#A76A76", archived: false, sortOrder: 2, createdAt: "2026-01-01T09:00:00.000Z", updatedAt: "2026-01-01T09:00:00.000Z" }
  ],
  items: [
    { id: "task-sunday", ownerId: null, spaceId: "home", type: "task", title: "Plan the week", description: "Gather appointments and choose three priorities.", dueDate: "2026-10-25", completed: false, priority: "high", pinned: true, createdAt: "2026-10-20T09:00:00.000Z", updatedAt: "2026-10-20T09:00:00.000Z" },
    { id: "note-cookbook", ownerId: null, spaceId: "home", type: "note", title: "Autumn supper notes", body: "Try the cider glaze with roast squash and soft herbs.", pinned: true, createdAt: "2026-10-18T09:00:00.000Z", updatedAt: "2026-10-18T09:00:00.000Z" },
    { id: "list-groceries", ownerId: null, spaceId: "home", type: "list", title: "Market list", entries: [{ id: "eggs", text: "Farm eggs", checked: false }, { id: "pear", text: "Conference pears", checked: true }], pinned: false, createdAt: "2026-10-19T09:00:00.000Z", updatedAt: "2026-10-19T09:00:00.000Z" },
    { id: "task-archive", ownerId: null, spaceId: "studio", type: "task", title: "Sort reference archive", description: "Group images by material and season.", completed: false, priority: "medium", pinned: true, createdAt: "2026-10-18T09:00:00.000Z", updatedAt: "2026-10-18T09:00:00.000Z" },
    { id: "link-reading", ownerId: null, spaceId: "studio", type: "link", title: "Material references", url: "https://example.com/materials", pinned: false, createdAt: "2026-10-17T09:00:00.000Z", updatedAt: "2026-10-17T09:00:00.000Z" }
  ]
};

export class LocalStillroomRepository implements StillroomRepository {
  constructor(private storage?: Storage | null) {}
  private resolveStorage(): Storage | null {
    if (this.storage !== undefined) return this.storage;
    try { return typeof window === "undefined" ? null : window.localStorage; }
    catch { return null; }
  }
  async load(): Promise<LoadResult> {
    const storage = this.resolveStorage();
    if (!storage) return { data: structuredClone(emptyData), isNewWorkspace: false, warning: { code: "storage-unavailable", message: "Browser storage is unavailable. Changes will not survive refresh until storage is available." } };
    let stored: string | null;
    try { stored = storage.getItem(STORAGE_KEY); }
    catch { return { data: structuredClone(emptyData), isNewWorkspace: false, warning: { code: "read-error", message: "Stillroom could not read browser storage. Existing data was left untouched." } }; }
    if (stored === null) return { data: structuredClone(emptyData), isNewWorkspace: true };
    let parsed: unknown;
    try { parsed = JSON.parse(stored); }
    catch {
      this.preserveRecovery(stored);
      return { data: structuredClone(emptyData), isNewWorkspace: false, warning: { code: "invalid-json", message: "Stored Stillroom data was unreadable. The original is preserved and demo data was not loaded.", recoveryKey: RECOVERY_KEY } };
    }
    if (!isAppData(parsed)) {
      this.preserveRecovery(stored);
      return { data: structuredClone(emptyData), isNewWorkspace: false, warning: { code: "malformed-data", message: "Stored Stillroom data has an unsupported format. The original is preserved and demo data was not loaded.", recoveryKey: RECOVERY_KEY } };
    }
    return { data: parsed, isNewWorkspace: false };
  }
  async save(data: AppData) {
    if (!isAppData(data)) throw new Error("Stillroom cannot save invalid data.");
    const storage = this.resolveStorage();
    if (!storage) throw new Error("Browser storage is unavailable. Your changes could not be saved.");
    let existing: string | null;
    try { existing = storage.getItem(STORAGE_KEY); }
    catch { throw new Error("Stillroom could not verify existing browser data. Your changes were not saved."); }
    if (existing !== null) {
      try {
        const parsed = JSON.parse(existing);
        if (!isAppData(parsed)) throw new Error("malformed");
      } catch {
        this.preserveRecovery(existing);
        throw new Error("Stillroom found unreadable existing data and preserved it. Your changes were not saved until recovery is resolved.");
      }
    }
    try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch { throw new Error("Stillroom could not save changes. Browser storage may be unavailable or full."); }
  }
  private preserveRecovery(raw: string) {
    try { this.resolveStorage()?.setItem(RECOVERY_KEY, raw); }
    catch { /* The original key remains untouched even if a recovery copy cannot be created. */ }
  }
  async createSpace(space: Space) { return { ...space, id: space.id || createId(), createdAt: now(), updatedAt: now() }; }
  async updateSpace(space: Space) { return { ...space, updatedAt: now() }; }
  async deleteSpace(id: string) { void id; }
  async createItem(item: ContentItem) { return { ...item, id: item.id || createId(), createdAt: now(), updatedAt: now() }; }
  async updateItem(item: ContentItem) { return { ...item, updatedAt: now() }; }
  async deleteItem(id: string) { void id; }
}

export const repository = new LocalStillroomRepository();
