import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarWorkspace } from "@/components/CalendarWorkspace";
import { CaptureWorkspace } from "@/components/CaptureWorkspace";
import { CalendarEntry } from "@/lib/models";
import { seedData } from "@/lib/repositories/localRepository";

afterEach(cleanup);

const noop = vi.fn(async () => true);

function renderCalendar(onSave = vi.fn(async () => true), entries: CalendarEntry[] = []) {
  render(<CalendarWorkspace entries={entries} portraits={[]} tasks={[]} spaces={seedData.spaces} selectedDate="2026-10-23" onSelectDate={vi.fn()} onSaveEntry={onSave} onDeleteEntry={vi.fn(async () => true)} onSavePortrait={vi.fn(async () => true)} onDeletePortrait={vi.fn(async () => true)} onAddTask={vi.fn()} onOpenItem={vi.fn()}/>);
  return onSave;
}

describe("Calendar and Catchall interactions", () => {
  it("prefills the selected date when adding a birthday and stores yearly recurrence", async () => {
    const onSave = renderCalendar();
    fireEvent.click(screen.getByRole("button", { name: "+ Add to this day" }));
    fireEvent.click(screen.getByRole("button", { name: "Birthday or anniversary" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Title (optional)" }), { target: { value: "Mum's birthday" } });
    expect(screen.getByRole("checkbox", { name: "Repeat every year" })).toHaveProperty("checked", true);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      type: "occasion", date: "2026-10-23", title: "Mum's birthday", yearly: true,
    }));
    await waitFor(() => expect(screen.queryByRole("form", { name: "Add occasion" })).toBeNull());
  });

  it("supports editing and deleting an existing journal entry", async () => {
    const entry: CalendarEntry = { id: "entry-1", type: "journal", date: "2026-10-23", title: "A note", body: "A calm day", createdAt: "now", updatedAt: "now" };
    const onSave = renderCalendar(vi.fn(async () => true), [entry]);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Title (optional)" }), { target: { value: "An edited note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: "entry-1", title: "An edited note" }));

    const onDelete = vi.fn(async () => true);
    cleanup();
    render(<CalendarWorkspace entries={[entry]} portraits={[]} tasks={[]} spaces={seedData.spaces} selectedDate="2026-10-23" onSelectDate={vi.fn()} onSaveEntry={noop} onDeleteEntry={onDelete} onSavePortrait={noop} onDeletePortrait={noop} onAddTask={vi.fn()} onOpenItem={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(within(screen.getByRole("form", { name: "Edit journal" })).getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(entry.id);
  });

  it("keeps Catchall text and focus after a successful quick save", async () => {
    const onSave = vi.fn(async () => true);
    render(<CaptureWorkspace entries={[]} spaces={seedData.spaces} onSave={onSave} onEdit={noop} onDelete={vi.fn()} onConvert={vi.fn(async () => true)}/>);
    const input = screen.getByRole("textbox", { name: "A thought, a reminder, anything to come back to" });
    fireEvent.change(input, { target: { value: "Call the greenhouse" } });
    fireEvent.click(screen.getByRole("button", { name: "Save for later" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("Call the greenhouse"));
    await waitFor(() => expect(input).toHaveProperty("value", ""));
    expect(document.activeElement).toBe(input);
  });

  it("retains Catchall text when persistence fails", async () => {
    render(<CaptureWorkspace entries={[]} spaces={[]} onSave={vi.fn(async () => false)} onEdit={noop} onDelete={vi.fn()} onConvert={vi.fn(async () => true)}/>);
    const input = screen.getByRole("textbox", { name: "A thought, a reminder, anything to come back to" });
    fireEvent.change(input, { target: { value: "Keep this thought" } });
    fireEvent.click(screen.getByRole("button", { name: "Save for later" }));

    expect(input).toHaveProperty("value", "Keep this thought");
    expect(await screen.findByText("Not saved. Your text is still here; try again.")).toBeTruthy();
  });
});
