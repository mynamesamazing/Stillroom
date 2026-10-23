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

  it("shows a circular 24-hour dial, timed events, and day navigation", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    const onSelectDate = vi.fn();
    const onOpenCalendar = vi.fn();
    const data: AppData = {
      ...seedData,
      items: [...seedData.items, { id: "dial-task", ownerId: null, spaceId: "studio", type: "task", title: "Prepare sketches", dueDate: "2026-10-24", completed: false, priority: "medium", pinned: false, createdAt: "now", updatedAt: "now" }],
      calendarEntries: [
        { id: "dial-event-later", type: "event", date: "2026-10-24", title: "Studio visit", time: "09:30", endTime: "10:30", location: "Studio", spaceId: "studio", createdAt: "now", updatedAt: "now" },
        { id: "dial-event-earlier", type: "event", date: "2026-10-24", title: "Breakfast", time: "06:00", spaceId: "home", createdAt: "now", updatedAt: "now" },
        { id: "dial-all-day", type: "occasion", date: "2026-10-24", title: "All-day occasion", spaceId: "home", createdAt: "now", updatedAt: "now" },
      ],
    };
    const onSaveCalendarEntry = vi.fn(async () => true);
    render(<HomeDashboard data={data} spaces={data.spaces} selectedDate="2026-10-24" onSelectDate={onSelectDate} onOpenCalendar={onOpenCalendar} onOpenItem={vi.fn()} onOpenSpace={vi.fn()} onSaveCalendarEntry={onSaveCalendarEntry}/>);

    const dial = screen.getByRole("region", { name: "Day Dial" });
    const dialButtons = within(dial);
    expect(screen.getByRole("heading", { name: "Day Dial" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Saturday, October 24" })).toBeTruthy();
    expect(screen.getAllByText("Prepare sketches").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Studio visit").length).toBeGreaterThan(0);
    const face = dial.querySelector("svg");
    expect(face?.querySelectorAll("[data-hour-marker]")).toHaveLength(24);
    expect(face?.querySelectorAll("[data-hour-label]")).toHaveLength(8);
    expect(face?.querySelector('[data-hour-label="0"]')?.textContent).toBe("12 AM");
    expect(face?.querySelector('[data-hour-label="6"]')?.textContent).toBe("6 AM");
    expect(face?.querySelector('[data-hour-label="12"]')?.textContent).toBe("12 PM");
    expect(face?.querySelector('[data-hour-label="18"]')?.textContent).toBe("6 PM");
    expect(face?.querySelector('[data-event-time="06:00"]')?.getAttribute("cx")).toBe("308");
    expect(face?.querySelectorAll("[data-event-time]")).toHaveLength(2);
    expect(face?.querySelector('[data-event-arc="dial-event-later"]')).toBeTruthy();
    expect(face?.querySelector('[data-solar-marker="sunrise"]')).toBeTruthy();
    expect(face?.querySelector('[data-solar-marker="sunset"]')).toBeTruthy();
    expect(face?.querySelector('[data-arc="daylight"]')).toBeTruthy();
    expect(face?.querySelector('[data-arc="night"]')).toBeTruthy();
    expect(screen.getByRole("slider", { name: "Studio visit start time" }).getAttribute("aria-valuetext")).toContain("9:30 AM");
    fireEvent.keyDown(screen.getByRole("slider", { name: "Studio visit start time" }), { key: "ArrowUp" });
    expect(onSaveCalendarEntry).toHaveBeenCalledWith(expect.objectContaining({ id: "dial-event-later", time: "09:45", endTime: "10:45" }));
    const eventList = screen.getByRole("list", { name: "Events for Saturday, October 24" });
    expect(within(eventList).getAllByRole("listitem").map(item => item.textContent)).toEqual([
      "Breakfast6:00 AM",
      "Studio visitStudio9:30 AM – 10:30 AM",
      "All-day occasionAll day",
    ]);

    fireEvent.click(dialButtons.getByRole("button", { name: "Previous day" }));
    expect(onSelectDate).toHaveBeenCalledWith("2026-10-23");
    fireEvent.click(dialButtons.getByRole("button", { name: "Next day" }));
    expect(onSelectDate).toHaveBeenCalledWith("2026-10-25");
    expect(onOpenCalendar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onSelectDate).toHaveBeenCalledWith("2026-10-23");

    fireEvent.click(dialButtons.getByRole("button", { name: "Open calendar" }));
    expect(onOpenCalendar).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Open this day in Calendar" }));
    expect(onOpenCalendar).toHaveBeenCalledTimes(2);
  });

  it("shows a current-time hand for today and an empty state without timed events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 23, 13, 30));
    render(<HomeDashboard data={seedData} spaces={seedData.spaces} selectedDate="2026-10-23" onSelectDate={vi.fn()} onOpenCalendar={vi.fn()} onOpenItem={vi.fn()} onOpenSpace={vi.fn()}/>);

    expect(screen.getByText("No timed plans for this day. There's room for whatever comes.")).toBeTruthy();
    expect(screen.getByLabelText(`Current time: ${new Date(2026, 9, 23, 13, 30).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`)).toBeTruthy();
    expect(screen.getByRole("region", { name: "Day Dial" }).querySelector("[data-current-time='true']")).toBeTruthy();
  });

  it("updates the dial and Home day content when another date is selected", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    const data: AppData = {
      ...seedData,
      calendarEntries: [{ id: "selected-event", type: "event", date: "2026-10-24", time: "09:30", title: "Studio visit", createdAt: "now", updatedAt: "now" }],
    };
    function InteractiveDashboard() {
      const [selectedDate, setSelectedDate] = React.useState("2026-10-23");
      return <HomeDashboard data={data} spaces={data.spaces} selectedDate={selectedDate} onSelectDate={setSelectedDate} onOpenCalendar={vi.fn()} onOpenItem={vi.fn()} onOpenSpace={vi.fn()}/>;
    }

    render(<InteractiveDashboard/>);
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));

    expect(screen.getByRole("heading", { name: "Saturday, October 24" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Events for Saturday, October 24" }).textContent).toContain("Studio visit");
    expect(screen.getByRole("region", { name: "Day Dial" }).querySelector("svg title")?.textContent).toBe("12-hour Day Dial for Saturday, October 24");

    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    expect(screen.getByRole("heading", { name: "Friday, October 23" })).toBeTruthy();
    expect(screen.getByText("No timed plans for this day. There's room for whatever comes.")).toBeTruthy();
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
