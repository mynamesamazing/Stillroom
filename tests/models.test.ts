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
