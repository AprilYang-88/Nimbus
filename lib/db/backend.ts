import type { Note } from "@/lib/types";

// Shared contract implemented by both the SQLite and Postgres backends. All
// methods are async so the two are interchangeable behind lib/db.
export type DbBackend = {
  listNotes(): Promise<Note[]>;
  getNote(id: number): Promise<Note | null>;
  hasNote(id: number): Promise<boolean>;
  createNote(content: string, tags: string[], relatedIds: number[]): Promise<Note>;
  updateNoteTags(id: number, tags: string[]): Promise<Note | null>;
  linkNotes(sourceId: number, targetId: number): Promise<Note | null>;
  unlinkNotes(sourceId: number, targetId: number): Promise<Note | null>;
};
