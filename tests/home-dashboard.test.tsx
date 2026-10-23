import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeDashboard } from "@/components/HomeDashboard";
import { AppData, CalendarEntry } from "@/lib/models";
import { seedData } from "@/lib/repositories/localRepository";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Home dashboard", () => {
  it("shows current-month occasions, previous-year memories, upcoming tasks and pinned items", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    const entries: CalendarEntry[] = [
      { id: "anniversary", type: "occasion", date: "2010-10-27", title: "Anniversary", yearly: true, createdAt: "now", updatedAt: "now" },
      { id: "memory", type: "memory", date: "2024-10-23", title: "A lovely day", createdAt: "now", updatedAt: "now" },
    ];
    const data: AppData = { ...seedData, calendarEntries: entries };
    render(<HomeDashboard data={data} spaces={data.spaces} selectedDate="2026-10-23" onSelectDate={vi.fn()} onOpenCalendar={vi.fn()} onOpenItem={vi.fn()} onOpenSpace={vi.fn()}/>);

    expect(screen.getByRole("heading", { name: "Today and coming up" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Worth Remembering" })).toBeTruthy();
    expect(screen.getByText("Anniversary")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "On This Day" })).toBeTruthy();
    expect(screen.getByText("A lovely day")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Close at Hand" })).toBeTruthy();
  });

  it("links a pinned item back to its Space", () => {
    const onOpenSpace = vi.fn();
    render(<HomeDashboard data={seedData} spaces={seedData.spaces} selectedDate="2026-10-23" onSelectDate={vi.fn()} onOpenCalendar={vi.fn()} onOpenItem={vi.fn()} onOpenSpace={onOpenSpace}/>);
    fireEvent.click(screen.getAllByRole("button", { name: "At Home" })[0]);
    expect(onOpenSpace).toHaveBeenCalledWith("home");
  });

  it("opens the selected calendar date from an upcoming occasion", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    const onSelectDate = vi.fn();
    const onOpenCalendar = vi.fn();
    const data: AppData = { ...seedData, calendarEntries: [{ id: "event", type: "event", date: "2026-10-29", title: "Dentist", createdAt: "now", updatedAt: "now" }] };
    render(<HomeDashboard data={data} spaces={data.spaces} selectedDate="2026-10-23" onSelectDate={onSelectDate} onOpenCalendar={onOpenCalendar} onOpenItem={vi.fn()} onOpenSpace={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: /Dentist/ }));

    expect(onSelectDate).toHaveBeenCalledWith("2026-10-29");
    expect(onOpenCalendar).toHaveBeenCalledOnce();
  });
});
