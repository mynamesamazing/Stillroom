import { AppData, ContentItem, Space } from "@/lib/models";

export interface LoadWarning { code: "invalid-json" | "malformed-data" | "storage-unavailable" | "read-error"; message: string; recoveryKey?: string }
export interface LoadResult { data: AppData; isNewWorkspace: boolean; warning?: LoadWarning }

export interface StillroomRepository {
  load(): Promise<LoadResult>;
  save(data: AppData): Promise<void>;
  createSpace(space: Space): Promise<Space>;
  updateSpace(space: Space): Promise<Space>;
  deleteSpace(id: string): Promise<void>;
  createItem(item: ContentItem): Promise<ContentItem>;
  updateItem(item: ContentItem): Promise<ContentItem>;
  deleteItem(id: string): Promise<void>;
}
