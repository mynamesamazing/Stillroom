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
    expect(newAction.className).toContain("h-12");
  });

  it.each([
    ["Tasks", "Create a Task", "task"],
    ["Notes", "Create a Note", "note"],
    ["Lists", "Create a List", "list"],
    ["Links", "Add a Link", "link"],
    ["Overview", "Create a Task", "task"],
  ] as const)("uses the %s empty-state action and creates the matching type", (tab, label, itemType) => {
    const onAdd = renderEmptySpace();
    fireEvent.click(screen.getByRole("tab", { name: tab }));
    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(onAdd).toHaveBeenCalledWith(itemType);
  });
});
