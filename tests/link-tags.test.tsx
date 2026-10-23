import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemEditor, SpaceView } from "@/components/StillroomApp";
import type { AppData, Tag } from "@/lib/models";
import { seedData } from "@/lib/repositories/localRepository";

afterEach(cleanup);

function renderEditor({ item = null, availableTags = [], spaceId = "home", onSave = vi.fn() }: {
  item?: AppData["items"][number] | null;
  availableTags?: Tag[];
  spaceId?: string;
  onSave?: ReturnType<typeof vi.fn>;
} = {}) {
  render(<ItemEditor type="link" item={item} spaceId={spaceId} spaces={seedData.spaces} availableTags={availableTags} onCancel={vi.fn()} onSave={onSave} onDelete={vi.fn()} />);
  return onSave;
}

function fillRequiredLinkFields() {
  fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Saved reference" } });
  fireEvent.change(screen.getByRole("textbox", { name: "URL" }), { target: { value: "https://example.com/reference" } });
}

describe("Link notes and reusable tags", () => {
  it("saves notes, multiple suggested tags, and Pin independently", () => {
    const onSave = renderEditor();
    fillRequiredLinkFields();
    fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), { target: { value: "A useful present for winter." } });
    fireEvent.click(screen.getByRole("button", { name: "Gift idea" }));
    fireEvent.click(screen.getByRole("button", { name: "Shopping" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Pin to overview" }));
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      type: "link",
      notes: "A useful present for winter.",
      tagIds: ["suggested-gift-idea", "suggested-shopping"],
      pinned: true,
    }), expect.arrayContaining([
      { id: "suggested-gift-idea", name: "Gift idea" },
      { id: "suggested-shopping", name: "Shopping" },
    ]));
  });

  it("creates a normalized custom tag and selects it", () => {
    const onSave = renderEditor();
    fillRequiredLinkFields();
    fireEvent.change(screen.getByRole("textbox", { name: "Create a tag" }), { target: { value: "  Weekend   Read " } });
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));

    const customTag = screen.getByRole("button", { name: "Weekend Read" });
    expect(customTag.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tagIds: [expect.stringMatching(/^custom-/)] }), [
      expect.objectContaining({ name: "Weekend Read" }),
    ]);
  });

  it("reuses workspace tags when creating a Link in another Space", () => {
    const sharedTag = { id: "custom-weekend", name: "Weekend reading" };
    const onSave = renderEditor({ spaceId: "studio", availableTags: [sharedTag] });
    fillRequiredLinkFields();
    fireEvent.click(screen.getByRole("button", { name: sharedTag.name }));
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ spaceId: "studio", tagIds: [sharedTag.id] }), [sharedTag]);
  });

  it("matches custom tag names without duplicating case or whitespace variants", () => {
    const sharedTag = { id: "custom-weekend", name: "Weekend reading" };
    const onSave = renderEditor({ availableTags: [sharedTag] });
    fillRequiredLinkFields();
    fireEvent.change(screen.getByRole("textbox", { name: "Create a tag" }), { target: { value: " weekend   READING " } });
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tagIds: [sharedTag.id] }), [sharedTag]);
  });

  it("loads and preserves existing notes and tags while editing a Link", () => {
    const tag = { id: "tag-reference", name: "Reference" };
    const link = seedData.items.find(item => item.type === "link");
    if (!link || link.type !== "link") throw new Error("Seed Link missing.");
    const onSave = renderEditor({ item: { ...link, notes: "Original notes", tagIds: [tag.id] }, availableTags: [tag] });

    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveProperty("value", "Original notes");
    expect(screen.getByRole("button", { name: "Reference" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), { target: { value: "Updated notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ notes: "Updated notes", tagIds: [tag.id] }), [tag]);
  });

  it("shows Link notes with truncation and wraps saved tags in the Links view", () => {
    const item = seedData.items.find(content => content.type === "link");
    if (!item || item.type !== "link") throw new Error("Seed Link missing.");
    const tag = { id: "tag-reference", name: "Reference" };
    const data: AppData = { ...seedData, tags: [tag], items: [{ ...item, spaceId: "home", notes: "Saved because it explains the material choices in detail.", tagIds: [tag.id] }] };
    render(<SpaceView
      space={data.spaces[0]}
      data={data}
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
    fireEvent.click(screen.getByRole("tab", { name: "Links" }));

    expect(screen.getByText("Saved because it explains the material choices in detail.").className).toContain("line-clamp-2");
    expect(screen.getByText("Reference")).toBeTruthy();
    expect(screen.getByText("Reference").parentElement?.className).toContain("flex-wrap");
  });
});
