import { describe, expect, it } from "vitest";
import {
  DAY_DIAL_LOCATION_STORAGE_KEY,
  cityLocation,
  loadDayDialPreference,
  parseLocationPreference,
  saveDayDialPreference,
} from "@/lib/dayDialLocation";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("Day Dial location preference", () => {
  it("persists only the chosen city preference in its dedicated key", () => {
    const storage = new MemoryStorage();
    saveDayDialPreference(storage, { kind: "city", cityId: "tokyo" });

    expect(storage.length).toBe(1);
    expect(storage.getItem(DAY_DIAL_LOCATION_STORAGE_KEY)).toBe('{"kind":"city","cityId":"tokyo"}');
    expect(loadDayDialPreference(storage)).toEqual({ kind: "city", cityId: "tokyo" });
    expect(cityLocation("tokyo")?.timeZone).toBe("Asia/Tokyo");
  });

  it("validates chosen coordinates and preserves no unrelated workspace data", () => {
    const storage = new MemoryStorage();
    const preference = { kind: "device" as const, latitude: 37.7749, longitude: -122.4194, timeZone: "America/Los_Angeles" };
    saveDayDialPreference(storage, preference);
    expect(loadDayDialPreference(storage)).toEqual(preference);
    expect(storage.length).toBe(1);
    expect(parseLocationPreference({ ...preference, latitude: 91 })).toBeNull();
    expect(parseLocationPreference({ ...preference, timeZone: "not/a-zone" })).toBeNull();
    expect(() => saveDayDialPreference(storage, { ...preference, longitude: 181 })).toThrow("invalid Day Dial location");
  });

  it("falls back safely for malformed or unknown stored preferences", () => {
    const storage = new MemoryStorage();
    storage.setItem(DAY_DIAL_LOCATION_STORAGE_KEY, "{broken");
    expect(loadDayDialPreference(storage)).toBeNull();
    storage.setItem(DAY_DIAL_LOCATION_STORAGE_KEY, JSON.stringify({ kind: "city", cityId: "not-a-city" }));
    expect(loadDayDialPreference(storage)).toBeNull();
  });
});
