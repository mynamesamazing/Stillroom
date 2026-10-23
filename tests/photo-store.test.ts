import { describe, expect, it, vi } from "vitest";
import { PHOTO_MAX_INPUT_BYTES, PHOTO_MAX_WORKSPACE_BYTES, PhotoBackend, PhotoStore, StoredPhoto } from "@/lib/photoStore";

class MemoryPhotoBackend implements PhotoBackend {
  photos: StoredPhoto[] = [];
  failPut = false;
  async list() { return this.photos; }
  async get(id: string) { return this.photos.find(photo => photo.id === id); }
  async put(photo: StoredPhoto) {
    if (this.failPut) throw new Error("Quota exceeded");
    this.photos.push(photo);
  }
  async delete(id: string) { this.photos = this.photos.filter(photo => photo.id !== id); }
}

describe("browser-local photo storage", () => {
  it("compresses before saving and returns a reference", async () => {
    const backend = new MemoryPhotoBackend();
    const store = new PhotoStore(backend, async () => new Blob(["compressed"], { type: "image/jpeg" }));
    const id = await store.add(new File(["original"], "memory.png", { type: "image/png" }));
    expect(id).toBeTruthy();
    expect((await store.get(id))?.blob.type).toBe("image/jpeg");
  });

  it("rejects non-image and oversized uploads before writing", async () => {
    const backend = new MemoryPhotoBackend();
    const compress = vi.fn(async () => new Blob(["compressed"]));
    const store = new PhotoStore(backend, compress);
    await expect(store.add(new File(["text"], "note.txt", { type: "text/plain" }))).rejects.toThrow("Choose an image");
    const largeImage = new File([new Uint8Array(PHOTO_MAX_INPUT_BYTES + 1)], "large.jpg", { type: "image/jpeg" });
    await expect(store.add(largeImage)).rejects.toThrow("smaller than 12 MB");
    expect(compress).not.toHaveBeenCalled();
    expect(backend.photos).toHaveLength(0);
  });

  it("enforces a workspace photo budget without deleting prior photos", async () => {
    const backend = new MemoryPhotoBackend();
    backend.photos.push({ id: "existing", blob: new Blob([new Uint8Array(PHOTO_MAX_WORKSPACE_BYTES)]), createdAt: "now" });
    const store = new PhotoStore(backend, async () => new Blob(["small"]));
    await expect(store.add(new File(["x"], "new.jpg", { type: "image/jpeg" }))).rejects.toThrow("photo space is full");
    expect(backend.photos).toHaveLength(1);
    expect(backend.photos[0].id).toBe("existing");
  });

  it("reports browser storage failures and does not return a successful reference", async () => {
    const backend = new MemoryPhotoBackend();
    backend.failPut = true;
    const store = new PhotoStore(backend, async () => new Blob(["compressed"]));
    await expect(store.add(new File(["original"], "memory.png", { type: "image/png" }))).rejects.toThrow("could not be saved in this browser");
    expect(backend.photos).toHaveLength(0);
  });
});
