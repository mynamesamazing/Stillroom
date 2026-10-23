import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HabitTracker } from "@/components/HabitTracker";

beforeEach(() => localStorage.removeItem("stillroom-habits-v1"));
afterEach(cleanup);

describe("Little things, often habit tracking", () => {
  it("records a manual amount, displays progress above 100%, and preserves the habit key", () => {
    render(<HabitTracker spaces={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "New habit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Water plants" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Goal" }), { target: { value: "10" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Unit" }), { target: { value: "minutes" } });
    fireEvent.click(screen.getByRole("button", { name: "Save habit" }));

    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount for Water plants" }), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Log" }));

    expect(screen.getByText("120%")).toBeTruthy();
    expect(localStorage.getItem("stillroom-habits-v1")).toContain("Water plants");
    expect(screen.getByRole("progressbar", { name: "Water plants progress" }).getAttribute("aria-valuenow")).toBe("100");
  });

  it("pauses and resumes a habit without discarding its history", () => {
    render(<HabitTracker spaces={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "New habit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Read a little" } });
    fireEvent.click(screen.getByRole("button", { name: "Save habit" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    expect(screen.getByRole("button", { name: "Resume Read a little" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Resume Read a little" }));
    expect(screen.getByRole("heading", { name: "Read a little" })).toBeTruthy();
    expect(localStorage.getItem("stillroom-habits-v1")).toContain('"paused":false');
  });

  it("uses the selected Calendar date for habit logging", () => {
    const onSelectedDateChange = vi.fn();
    render(<HabitTracker spaces={[]} selectedDate="2026-10-23" onSelectedDateChange={onSelectedDateChange}/>);
    fireEvent.click(screen.getByRole("button", { name: "New habit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Walk" } });
    fireEvent.click(screen.getByRole("button", { name: "Save habit" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount for Walk" }), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Log" }));

    const saved = JSON.parse(localStorage.getItem("stillroom-habits-v1") || "[]");
    expect(saved[0].logs[0].date).toBe("2026-10-23");
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(onSelectedDateChange).toHaveBeenCalledWith("2026-10-24");
  });
});
