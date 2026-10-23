import { describe, expect, it } from "vitest";
import { entryOccursOnDate, isLeapYear, localDateKey, monthDates, parseLocalDate } from "@/lib/dates";
import { CalendarEntry } from "@/lib/models";

describe("calendar date utilities", () => {
  it("parses local dates without shifting across time zones", () => {
    const date = parseLocalDate("2024-02-29");
    expect(localDateKey(date)).toBe("2024-02-29");
  });

  it("rejects impossible dates", () => {
    expect(() => parseLocalDate("2025-02-29")).toThrow("Invalid calendar date");
  });

  it("calculates leap years using Gregorian century rules", () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
  });

  it("keeps yearly occasions as one record and maps leap birthdays to February 28 in common years", () => {
    const birthday: CalendarEntry = {
      id: "leap-birthday", type: "occasion", date: "2000-02-29", title: "Birthday",
      yearly: true, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(entryOccursOnDate(birthday, parseLocalDate("2025-02-28"))).toBe(true);
    expect(entryOccursOnDate(birthday, parseLocalDate("2025-03-01"))).toBe(false);
    expect(entryOccursOnDate(birthday, parseLocalDate("2024-02-29"))).toBe(true);
  });

  it("returns a six-week calendar grid beginning Monday", () => {
    const dates = monthDates(parseLocalDate("2026-10-23"));
    expect(dates).toHaveLength(42);
    expect(dates[0].getDay()).toBe(1);
    expect(dates[dates.length - 1].getDay()).toBe(0);
  });
});
