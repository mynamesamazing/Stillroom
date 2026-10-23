import React, { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemEditor, Modal, SpaceEditor } from "@/components/StillroomApp";
import { seedData } from "@/lib/repositories/localRepository";

afterEach(cleanup);

function ModalHarness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)}>Open editor</button>
    {open && <Modal title="Edit item" onClose={() => { onClose(); setOpen(false); }}>
      <form onSubmit={event => { event.preventDefault(); }}>
        <input autoFocus aria-label="Title" />
        <button type="button">Last action</button>
        <button type="submit">Save changes</button>
      </form>
    </Modal>}
  </>;
}

describe("editor dialog keyboard behavior", () => {
  it("closes from the labeled Close button", async () => {
    const onClose = vi.fn();
    render(<ModalHarness onClose={onClose} />);
    const opener = screen.getByRole("button", { name: "Open editor" });
    opener.focus();
    fireEvent.click(opener);

    fireEvent.click(await screen.findByRole("button", { name: "Close dialog" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("focuses dialog content, contains Tab focus, and restores focus after Escape", async () => {
    const onClose = vi.fn();
    render(<ModalHarness onClose={onClose} />);

    const opener = screen.getByRole("button", { name: "Open editor" });
    opener.focus();
    fireEvent.click(opener);

    const title = await screen.findByRole("textbox", { name: "Title" });
    await waitFor(() => expect(document.activeElement).toBe(title));
    const close = screen.getByRole("button", { name: "Close dialog" });
    close.focus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(document.activeElement).toBe(save);

    fireEvent.keyDown(save, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("saves a Space from the labeled form action", () => {
    const onSave = vi.fn();
    render(<SpaceEditor value={null} nextOrder={0} onCancel={vi.fn()} onSave={onSave}/>);

    fireEvent.change(screen.getByRole("textbox", { name: /Name/ }), { target: { value: "Garden" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Space" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Garden", sortOrder: 0 }));
  });

  it("keeps Cancel from saving an unfinished Space", () => {
    const onCancel = vi.fn();
    const onSave = vi.fn();
    render(<SpaceEditor value={null} nextOrder={0} onCancel={onCancel} onSave={onSave}/>);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves a Task through its mobile form controls", () => {
    const onSave = vi.fn();
    render(<ItemEditor type="task" item={null} spaceId="home" spaces={seedData.spaces} onCancel={vi.fn()} onSave={onSave} onDelete={vi.fn()}/>);

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Water plants" } });
    fireEvent.click(screen.getByRole("button", { name: "Add task" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: "task", title: "Water plants", spaceId: "home" }));
  });

  it("saves a Note and its labeled body field", () => {
    const onSave = vi.fn();
    render(<ItemEditor type="note" item={null} spaceId="home" spaces={seedData.spaces} onCancel={vi.fn()} onSave={onSave} onDelete={vi.fn()}/>);

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Ideas" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), { target: { value: "A few notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: "note", title: "Ideas", body: "A few notes" }));
  });

  it("adds accessible List entries and saves them", () => {
    const onSave = vi.fn();
    render(<ItemEditor type="list" item={null} spaceId="home" spaces={seedData.spaces} onCancel={vi.fn()} onSave={onSave} onDelete={vi.fn()}/>);

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Shopping" } });
    fireEvent.change(screen.getByRole("textbox", { name: "List entry 1" }), { target: { value: "Apples" } });
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));
    expect(screen.getByRole("textbox", { name: "List entry 2" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove list entry 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Add list" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: "list", entries: [expect.objectContaining({ text: "Apples" })] }));
  });

  it("validates and saves a Link URL", () => {
    const onSave = vi.fn();
    render(<ItemEditor type="link" item={null} spaceId="home" spaces={seedData.spaces} onCancel={vi.fn()} onSave={onSave} onDelete={vi.fn()}/>);
    const url = screen.getByRole("textbox", { name: "URL" });

    expect(url.getAttribute("type")).toBe("url");
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Reference" } });
    fireEvent.change(url, { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: "link", url: "https://example.com", notes: "", tagIds: [] }), []);
  });
});
