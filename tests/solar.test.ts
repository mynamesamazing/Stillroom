import { describe, expect, it } from "vitest";
import { calculateSolarDay, formatSolarTime } from "@/lib/solar";

const london = { latitude: 51.5072, longitude: -0.1276, timeZone: "Europe/London" };
const tromso = { latitude: 69.6492, longitude: 18.9553, timeZone: "Europe/Oslo" };

describe("local solar calculations", () => {
  it("calculates seasonal London sunrise and sunset in local time", () => {
    const summer = calculateSolarDay("2026-06-21", london);
    const winter = calculateSolarDay("2026-12-21", london);

    expect(summer.kind).toBe("normal");
    expect(winter.kind).toBe("normal");
    if (summer.kind !== "normal" || winter.kind !== "normal") throw new Error("Expected non-polar London daylight.");
    expect(formatSolarTime(summer.sunrise)).toBe("4:43 AM");
    expect(formatSolarTime(summer.sunset)).toBe("9:21 PM");
    expect(formatSolarTime(winter.sunrise)).toBe("8:03 AM");
    expect(formatSolarTime(winter.sunset)).toBe("3:53 PM");
    expect(summer.dayLength).toBeGreaterThan(winter.dayLength);
  });

  it("handles polar day and polar night without fake sunrise markers", () => {
    expect(calculateSolarDay("2026-06-21", tromso)).toEqual({ kind: "polar-day" });
    expect(calculateSolarDay("2026-12-21", tromso)).toEqual({ kind: "polar-night" });
  });

  it("uses the selected city's time zone and rejects invalid dates or coordinates", () => {
    const londonSummer = calculateSolarDay("2026-06-21", london);
    const newYorkSummer = calculateSolarDay("2026-06-21", { latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" });
    expect(londonSummer.kind).toBe("normal");
    expect(newYorkSummer.kind).toBe("normal");
    if (londonSummer.kind !== "normal" || newYorkSummer.kind !== "normal") throw new Error("Expected non-polar daylight.");
    expect(formatSolarTime(londonSummer.sunrise)).not.toBe(formatSolarTime(newYorkSummer.sunrise));
    expect(() => calculateSolarDay("2026-02-30", london)).toThrow("Invalid solar date");
    expect(() => calculateSolarDay("2026-06-21", { ...london, latitude: 91 })).toThrow("coordinates are out of range");
  });
});
