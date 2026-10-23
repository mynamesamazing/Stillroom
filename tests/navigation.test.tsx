import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreationMenu } from "@/components/StillroomApp";

afterEach(cleanup);

describe("mobile creation menu interaction", () => {
  it("supports arrow-key navigation and creates the selected item type", async () => {
    const onAdd = vi.fn();
    render(<CreationMenu onAdd={onAdd} />);

    const trigger = screen.getByRole("button", { name: "New" });
    fireEvent.click(trigger);

    const task = await screen.findByRole("menuitem", { name: "Task" });
    const note = screen.getByRole("menuitem", { name: "Note" });
    await waitFor(() => expect(document.activeElement).toBe(task));

    fireEvent.keyDown(task, { key: "ArrowDown" });
    expect(document.activeElement).toBe(note);
    fireEvent.click(note);

    expect(onAdd).toHaveBeenCalledWith("note");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<CreationMenu onAdd={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "New" });
    fireEvent.click(trigger);

    const task = await screen.findByRole("menuitem", { name: "Task" });
    await waitFor(() => expect(document.activeElement).toBe(task));
    fireEvent.keyDown(task, { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
