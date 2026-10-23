import { createId } from "./models";

export const PHOTO_MAX_INPUT_BYTES = 12 * 1024 * 1024;
export const PHOTO_MAX_BLOB_BYTES = 1.5 * 1024 * 1024;
export const PHOTO_MAX_WORKSPACE_BYTES = 32 * 1024 * 1024;
const DATABASE_NAME = "stillroom-private-media-v1";
const STORE_NAME = "photos";
let databasePromise: Promise<IDBDatabase> | undefined;

export interface StoredPhoto { id: string; blob: Blob; createdAt: string }
export interface PhotoBackend {
  list(): Promise<StoredPhoto[]>;
  get(id: string): Promise<StoredPhoto | undefined>;
  put(photo: StoredPhoto): Promise<void>;
  delete(id: string): Promise<void>;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("This browser does not support local photo storage."));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Browser photo storage could not be opened."));
    request.onblocked = () => reject(new Error("Browser photo storage is busy in another tab. Close the other Stillroom tab and try again."));
  });
  databasePromise.catch(() => { databasePromise = undefined; });
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Browser photo storage could not complete the request."));
  });
}

const browserBackend: PhotoBackend = {
  async list() { const db = await openDatabase(); return requestResult(db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll()); },
  async get(id) { const db = await openDatabase(); return requestResult(db.transaction(STORE_NAME).objectStore(STORE_NAME).get(id)); },
  async put(photo) {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(photo);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("Browser photo storage could not commit the photo."));
      transaction.onabort = () => reject(new Error("Browser photo storage quota was exceeded or the save was interrupted."));
    });
  },
  async delete(id) { const db = await openDatabase(); await requestResult(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(id)); },
};

async function compressImage(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") throw new Error("This browser cannot prepare photos for safe local storage.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("A photo could not be prepared for storage.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("A photo could not be compressed.")), "image/jpeg", 0.78));
    if (blob.size > PHOTO_MAX_BLOB_BYTES) throw new Error("This photo is still too large after compression. Choose a smaller image.");
    return blob;
  } finally { bitmap.close(); }
}

export class PhotoStore {
  constructor(private backend: PhotoBackend = browserBackend, private compress: (file: File) => Promise<Blob> = compressImage) {}

  async add(file: File): Promise<string> {
    if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
    if (file.size > PHOTO_MAX_INPUT_BYTES) throw new Error("Choose a photo smaller than 12 MB.");
    const blob = await this.compress(file);
    if (blob.size > PHOTO_MAX_BLOB_BYTES) throw new Error("This photo is too large for local storage.");
    let existing: StoredPhoto[];
    try { existing = await this.backend.list(); }
    catch { throw new Error("Stillroom could not check local photo storage. No new photo was saved."); }
    const currentBytes = existing.reduce((total, photo) => total + photo.blob.size, 0);
    if (currentBytes + blob.size > PHOTO_MAX_WORKSPACE_BYTES) throw new Error("Stillroom's local photo space is full. Remove a photo or choose a smaller image.");
    const id = createId();
    try {
      await this.backend.put({ id, blob, createdAt: new Date().toISOString() });
      return id;
    } catch {
      throw new Error("The photo could not be saved in this browser. Your entry has not been changed.");
    }
  }

  get(id: string) { return this.backend.get(id); }
  delete(id: string) { return this.backend.delete(id); }
}

export const photoStore = new PhotoStore();
