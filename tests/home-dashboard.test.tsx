import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("shows a selected day's dated tasks and calendar entries and navigates weeks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    const onSelectDate = vi.fn();
    const onOpenCalendar = vi.fn();
    const data: AppData = {
      ...seedData,
      items: [...seedData.items, { id: "dial-task", ownerId: null, spaceId: "studio", type: "task", title: "Prepare sketches", dueDate: "2026-10-24", completed: false, priority: "medium", pinned: false, createdAt: "now", updatedAt: "now" }],
      calendarEntries: [{ id: "dial-event", type: "event", date: "2026-10-24", title: "Studio visit", spaceId: "studio", createdAt: "now", updatedAt: "now" }],
    };
    render(<HomeDashboard data={data} spaces={data.spaces} selectedDate="2026-10-24" onSelectDate={onSelectDate} onOpenCalendar={onOpenCalendar} onOpenItem={vi.fn()} onOpenSpace={vi.fn()}/>);

    const dial = screen.getByRole("region", { name: "Day Dial" });
    const dialButtons = within(dial);
    expect(dialButtons.getAllByRole("button").filter(button => button.hasAttribute("aria-pressed"))).toHaveLength(7);
    expect(screen.getByRole("heading", { name: "Day Dial" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Saturday, October 24" })).toBeTruthy();
    expect(screen.getAllByText("Prepare sketches").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Studio visit").length).toBeGreaterThan(0);
    expect(dialButtons.getByRole("button", { name: "Saturday, October 24" }).getAttribute("aria-pressed")).toBe("true");
    expect(dialButtons.getByRole("button", { name: "Saturday, October 24" }).querySelector("i")?.getAttribute("style")).toContain("rgb(95, 114, 87)");
    expect(within(screen.getByLabelText("Choose a day")).getByRole("button", { name: "Sunday, October 25" })).toBeTruthy();
    expect(screen.getByLabelText("Choose a day").className).toContain("overflow-x-auto");
    expect(screen.getByLabelText("Choose a day").firstElementChild?.className).toContain("sm:grid-cols-7");

    fireEvent.click(screen.getByRole("button", { name: "Sunday, October 25" }));
    expect(onSelectDate).toHaveBeenCalledWith("2026-10-25");
    expect(onOpenCalendar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    expect(onSelectDate).toHaveBeenCalledWith("2026-10-17");
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(onSelectDate).toHaveBeenCalledWith("2026-10-31");
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onSelectDate).toHaveBeenCalledWith("2026-10-23");

    fireEvent.click(screen.getByRole("button", { name: "Open this day in Calendar" }));
    expect(onOpenCalendar).toHaveBeenCalledOnce();
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
