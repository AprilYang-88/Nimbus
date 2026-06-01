import type { DbBackend } from "@/lib/db/backend";

// Pick the storage backend by environment:
//   DATABASE_URL set  -> Supabase / Postgres (cloud)
//   otherwise         -> local SQLite file (zero-config, offline)
// The chosen module is imported lazily so the unused driver (e.g. the native
// better-sqlite3) is never loaded when running against the other backend.
let backendPromise: Promise<DbBackend> | null = null;

function getBackend(): Promise<DbBackend> {
  if (!backendPromise) {
    backendPromise = (
      process.env.DATABASE_URL
        ? import("@/lib/db/postgres")
        : import("@/lib/db/sqlite")
    ).then((mod) => mod.backend);
  }
  return backendPromise;
}

export async function listNotes() {
  return (await getBackend()).listNotes();
}

export async function getNote(id: number) {
  return (await getBackend()).getNote(id);
}

export async function hasNote(id: number) {
  return (await getBackend()).hasNote(id);
}

export async function createNote(content: string, tags: string[], relatedIds: number[]) {
  return (await getBackend()).createNote(content, tags, relatedIds);
}

export async function updateNoteTags(id: number, tags: string[]) {
  return (await getBackend()).updateNoteTags(id, tags);
}

export async function linkNotes(sourceId: number, targetId: number) {
  return (await getBackend()).linkNotes(sourceId, targetId);
}

export async function unlinkNotes(sourceId: number, targetId: number) {
  return (await getBackend()).unlinkNotes(sourceId, targetId);
}
