import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpaceView } from "@/components/StillroomApp";
import type { AppData, ItemType } from "@/lib/models";
import { seedData } from "@/lib/repositories/localRepository";

afterEach(cleanup);

function renderEmptySpace(onAdd: (type: ItemType) => void = vi.fn()) {
  const data: AppData = { spaces: [seedData.spaces[0]], items: [] };
  render(<SpaceView
    space={data.spaces[0]}
    data={data}
    onBack={vi.fn()}
    onEdit={vi.fn()}
    createdTab={null}
    onCreatedTabShown={vi.fn()}
    onAdd={onAdd}
    onEditItem={vi.fn()}
    onMove={vi.fn()}
    onTogglePin={vi.fn()}
    onToggleTask={vi.fn()}
  />);
  return onAdd;
}

describe("Space view mobile navigation and empty states", () => {
  it("keeps + New beside horizontally scrollable tabs with search below", () => {
    renderEmptySpace();

    const tablist = screen.getByRole("tablist", { name: "Space content" });
    const newAction = screen.getByRole("button", { name: "New" });
    const row = tablist.parentElement;
    const search = screen.getByPlaceholderText("Search items");

    expect(row).toBe(newAction.parentElement?.parentElement);
    expect(row?.className).toContain("min-w-0");
    expect(tablist.className).toContain("overflow-x-auto");
    expect(search.parentElement?.parentElement).toBe(tablist.parentElement?.parentElement);
    expect(newAction.className).toContain("h-11");
    expect(newAction.className).toContain("shrink-0");
    expect(newAction.className).toContain("px-2");
    expect(newAction.className).toContain("border");
    expect(newAction.className).toContain("sm:h-10");
    expect(newAction.className).toContain("sm:px-4");
    expect(newAction.className).toContain("sm:bg-stone-800");
    expect(newAction.className).toContain("dark:sm:bg-stone-100");
  });

  it.each([
    ["Tasks", "Create a Task", "task"],
    ["Notes", "Create a Note", "note"],
    ["Lists", "Create a List", "list"],
    ["Links", "Add a Link", "link"],
  ] as const)("uses the %s empty-state action and creates the matching type", (tab, label, itemType) => {
    const onAdd = renderEmptySpace();
    fireEvent.click(screen.getByRole("tab", { name: tab }));
    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(onAdd).toHaveBeenCalledWith(itemType);
  });

  it("shows the Overview empty state without a creation action", () => {
    renderEmptySpace();

    expect(screen.getByRole("heading", { name: "Nothing pinned yet" })).toBeTruthy();
    expect(screen.getByText("Pin useful things so they stay close at hand.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Create|Add/ })).toBeNull();
  });

  it("continues to show pinned items on the Overview dashboard", () => {
    render(<SpaceView
      space={seedData.spaces[0]}
      data={seedData}
      onBack={vi.fn()}
      onEdit={vi.fn()}
      createdTab={null}
      onCreatedTabShown={vi.fn()}
      onAdd={vi.fn()}
      onEditItem={vi.fn()}
      onMove={vi.fn()}
      onTogglePin={vi.fn()}
      onToggleTask={vi.fn()}
    />);

    expect(screen.getByRole("button", { name: /Plan the week/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Autumn supper notes/ })).toBeTruthy();
  });
});
