import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpaceCard } from "@/components/StillroomApp";
import { seedData } from "@/lib/repositories/localRepository";

afterEach(cleanup);

function renderCard() {
  const onOpen = vi.fn();
  const onReorder = vi.fn();
  const onEdit = vi.fn();
  const onArchive = vi.fn();
  render(<SpaceCard
    space={seedData.spaces[0]}
    index={1}
    lastIndex={2}
    showArchived={false}
    onOpen={onOpen}
    onReorder={onReorder}
    onEdit={onEdit}
    onArchive={onArchive}
  />);
  return { onOpen, onReorder, onEdit, onArchive };
}

describe("Space card interactions", () => {
  it("opens the Space through a single accessible main-area button", () => {
    const { onOpen } = renderCard();

    const openButton = screen.getByRole("button", { name: `Open ${seedData.spaces[0].name}` });
    expect(openButton.tagName).toBe("BUTTON");
    expect(openButton.querySelector("button")).toBeNull();
    expect(openButton.className).toContain("absolute");
    expect(openButton.className).toContain("inset-0");
    fireEvent.click(openButton);

    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("keeps reorder, Edit, and Archive controls independent from opening", () => {
    const { onOpen, onReorder, onEdit, onArchive } = renderCard();

    fireEvent.click(screen.getByRole("button", { name: `Move ${seedData.spaces[0].name} up` }));
    fireEvent.click(screen.getByRole("button", { name: `Move ${seedData.spaces[0].name} down` }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: `Archive ${seedData.spaces[0].name}` }));

    expect(onOpen).not.toHaveBeenCalled();
    expect(onReorder).toHaveBeenNthCalledWith(1, -1);
    expect(onReorder).toHaveBeenNthCalledWith(2, 1);
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onArchive).toHaveBeenCalledOnce();
  });
});
