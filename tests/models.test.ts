import { describe, expect, it } from "vitest";
import { seedData, emptyData, STORAGE_KEY, RECOVERY_KEY, LocalStillroomRepository } from "@/lib/repositories/localRepository";
import { itemTypeTab, shouldShowOnboarding } from "@/components/StillroomApp";
import { contrastRatio } from "@/lib/contrast";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("Stillroom repository", () => {
  it("creates and edits Spaces", async () => {
    const repo = new LocalStillroomRepository(new MemoryStorage());
    const space = { ...seedData.spaces[0], id: "garden", name: "Garden" };
    expect((await repo.createSpace(space)).name).toBe("Garden");
    expect((await repo.updateSpace({ ...space, name: "Courtyard" })).name).toBe("Courtyard");
  });

  it("archives, restores, and persists data", async () => {
    const storage = new MemoryStorage(); const repo = new LocalStillroomRepository(storage);
    await repo.save({ ...seedData, spaces: seedData.spaces.map(s => s.id === "home" ? { ...s, archived: true } : s) });
    expect(storage.getItem(STORAGE_KEY)).toContain("archived");
    const restored = { ...seedData, spaces: seedData.spaces.map(s => s.id === "home" ? { ...s, archived: false } : s) };
    await repo.save(restored); expect((await repo.load()).data.spaces[0].archived).toBe(false);
  });

  it("moves items between Spaces", async () => {
    const repo = new LocalStillroomRepository(new MemoryStorage());
    const task = seedData.items[0];
    const moved = await repo.updateItem({ ...task, spaceId: "studio" });
    expect(moved.spaceId).toBe("studio");
  });

  it("shows onboarding only for a fresh workspace without storage warnings", () => {
    expect(shouldShowOnboarding(true, false)).toBe(true);
    expect(shouldShowOnboarding(false, false)).toBe(false);
    expect(shouldShowOnboarding(true, true)).toBe(false);
  });

  it("routes each created item type to its content tab", () => {
    expect(itemTypeTab("task")).toBe("task");
    expect(itemTypeTab("note")).toBe("note");
    expect(itemTypeTab("list")).toBe("list");
    expect(itemTypeTab("link")).toBe("link");
  });

  it("keeps selected tab foreground contrast above WCAG AA", () => {
    expect(contrastRatio("#292724", "#FCFAF5")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#EEEBE2", "#2B2A26")).toBeGreaterThanOrEqual(4.5);
  });

  it("loads valid data after refresh", async () => {
    const storage = new MemoryStorage(); const repo = new LocalStillroomRepository(storage);
    await repo.save(seedData);
    const loaded = await repo.load();
    expect(loaded.warning).toBeUndefined();
    expect(loaded.data).toEqual(seedData);
  });

  it("loads older Links with safe notes and tag defaults without rewriting stored data", async () => {
    const storage = new MemoryStorage();
    const legacy = {
      spaces: seedData.spaces,
      items: seedData.items.map(item => {
        if (item.type !== "link") return item;
        return {
          id: item.id,
          ownerId: item.ownerId,
          spaceId: item.spaceId,
          type: item.type,
          title: item.title,
          url: item.url,
          pinned: item.pinned,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),
    };
    const raw = JSON.stringify(legacy);
    storage.setItem(STORAGE_KEY, raw);

    const loaded = await new LocalStillroomRepository(storage).load();
    const link = loaded.data.items.find(item => item.type === "link");

    expect(loaded.warning).toBeUndefined();
    expect(loaded.data.tags).toEqual([]);
    expect(link).toMatchObject({ notes: "", tagIds: [] });
    expect(loaded.data.spaces).toEqual(seedData.spaces);
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });

  it("persists and reuses one workspace tag across Links in different Spaces", async () => {
    const storage = new MemoryStorage();
    const repo = new LocalStillroomRepository(storage);
    const tag = { id: "custom-reading", name: "Weekend reading" };
    const links = [
      { id: "link-home", ownerId: null, spaceId: "home", type: "link" as const, title: "Essay", url: "https://example.com/essay", notes: "Read on Sunday", tagIds: [tag.id], pinned: false, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "link-studio", ownerId: null, spaceId: "studio", type: "link" as const, title: "Research", url: "https://example.com/research", notes: "", tagIds: [tag.id], pinned: false, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ];

    await repo.save({ ...emptyData, spaces: seedData.spaces.slice(0, 2), items: links, tags: [tag] });
    const loaded = await repo.load();

    expect(loaded.data.tags).toEqual([tag]);
    expect(loaded.data.items.filter(item => item.type === "link").map(item => item.tagIds)).toEqual([[tag.id], [tag.id]]);
  });

  it("normalizes duplicate tag names and keeps Link references valid", async () => {
    const storage = new MemoryStorage();
    const repo = new LocalStillroomRepository(storage);
    const link = seedData.items.find(item => item.type === "link");
    if (!link || link.type !== "link") throw new Error("Seed Link missing.");

    await repo.save({
      ...seedData,
      tags: [{ id: "tag-first", name: "  Read   Later " }, { id: "tag-duplicate", name: "read later" }],
      items: [{ ...link, tagIds: ["tag-first", "tag-duplicate", "missing-tag"] }],
    });
    const loaded = await repo.load();

    expect(loaded.data.tags).toEqual([{ id: "tag-first", name: "Read Later" }]);
    expect(loaded.data.items[0]).toMatchObject({ type: "link", tagIds: ["tag-first"] });
  });

  it("preserves invalid JSON without overwriting it", async () => {
    const storage = new MemoryStorage(); storage.setItem(STORAGE_KEY, "{broken");
    const loaded = await new LocalStillroomRepository(storage).load();
    expect(loaded.warning?.code).toBe("invalid-json");
    expect(storage.getItem(STORAGE_KEY)).toBe("{broken");
    expect(storage.getItem(RECOVERY_KEY)).toBe("{broken");
  });

  it("preserves malformed but valid JSON", async () => {
    const storage = new MemoryStorage(); storage.setItem(STORAGE_KEY, JSON.stringify({ spaces: "not-an-array", items: [] }));
    const loaded = await new LocalStillroomRepository(storage).load();
    expect(loaded.warning?.code).toBe("malformed-data");
    expect(storage.getItem(STORAGE_KEY)).toContain("not-an-array");
  });

  it("returns a warning when storage is unavailable", async () => {
    const loaded = await new LocalStillroomRepository(null).load();
    expect(loaded.warning?.code).toBe("storage-unavailable");
  });

  it("reports unavailable and quota write failures", async () => {
    await expect(new LocalStillroomRepository(null).save(seedData)).rejects.toThrow("unavailable");
    const storage = new MemoryStorage(); storage.setItem = () => { throw new DOMException("Quota exceeded", "QuotaExceededError"); };
    await expect(new LocalStillroomRepository(storage).save(seedData)).rejects.toThrow("could not save");
  });

  it("shows onboarding only for a genuinely fresh workspace", async () => {
    const storage = new MemoryStorage();
    const fresh = await new LocalStillroomRepository(storage).load();
    expect(fresh.isNewWorkspace).toBe(true);
    expect(fresh.data).toEqual(emptyData);
  });

  it("does not show onboarding for a returning user", async () => {
    const storage = new MemoryStorage(); const repo = new LocalStillroomRepository(storage);
    await repo.save(seedData);
    expect((await repo.load()).isNewWorkspace).toBe(false);
  });

  it("persists fictional sample content when requested", async () => {
    const storage = new MemoryStorage(); const repo = new LocalStillroomRepository(storage);
    await repo.save(structuredClone(seedData));
    expect((await repo.load()).data).toEqual(seedData);
    expect(storage.getItem(STORAGE_KEY)).toContain("At Home");
  });

  it("keeps onboarding data out of storage after a failed sample write", async () => {
    const storage = new MemoryStorage(); storage.setItem = () => { throw new DOMException("Quota exceeded", "QuotaExceededError"); };
    await expect(new LocalStillroomRepository(storage).save(structuredClone(seedData))).rejects.toThrow("could not save");
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });
});
