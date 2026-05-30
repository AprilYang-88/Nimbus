import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Note, RelatedNote } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "nimbus.db"));
db.pragma("busy_timeout = 5000");
try {
  db.pragma("journal_mode = WAL");
} catch (error) {
  // Next.js build workers may initialize routes in parallel. Another worker
  // can finish the WAL transition while this connection waits.
  if ((error as { code?: string }).code !== "SQLITE_BUSY") throw error;
}
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS note_tags (
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
  );
  CREATE TABLE IF NOT EXISTS note_links (
    source_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('manual', 'recommended')),
    PRIMARY KEY (source_id, target_id)
  );
`);

type NoteRow = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function getTags(noteId: number) {
  return db
    .prepare(`
      SELECT tags.name FROM tags
      JOIN note_tags ON note_tags.tag_id = tags.id
      WHERE note_tags.note_id = ?
      ORDER BY tags.name
    `)
    .all(noteId)
    .map((row) => (row as { name: string }).name);
}

function getRelatedNotes(noteId: number): RelatedNote[] {
  return db
    .prepare(`
      SELECT notes.id, notes.title, note_links.kind
      FROM note_links
      JOIN notes ON notes.id = note_links.target_id
      WHERE note_links.source_id = ?
      ORDER BY note_links.kind, notes.updated_at DESC
    `)
    .all(noteId) as RelatedNote[];
}

function serialize(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: getTags(row.id),
    relatedNotes: getRelatedNotes(row.id),
  };
}

export function listNotes() {
  const rows = db.prepare("SELECT * FROM notes ORDER BY updated_at DESC, id DESC").all() as NoteRow[];
  return rows.map(serialize);
}

export function getNote(id: number) {
  const row = db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as NoteRow | undefined;
  return row ? serialize(row) : null;
}

function setTags(noteId: number, tagNames: string[]) {
  const cleanTags = [...new Set(tagNames.map((tag) => tag.trim()).filter(Boolean))].slice(0, 8);
  const insertTag = db.prepare("INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING");
  const getTag = db.prepare("SELECT id FROM tags WHERE name = ?");
  const linkTag = db.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)");

  db.prepare("DELETE FROM note_tags WHERE note_id = ?").run(noteId);
  for (const name of cleanTags) {
    insertTag.run(name);
    const tag = getTag.get(name) as { id: number };
    linkTag.run(noteId, tag.id);
  }
}

export const createNote = db.transaction((content: string, tags: string[], relatedIds: number[]) => {
  const firstLine = content.split("\n").find((line) => line.trim()) ?? "未命名笔记";
  const title = firstLine.trim().slice(0, 42);
  const result = db.prepare("INSERT INTO notes (title, content) VALUES (?, ?)").run(title, content.trim());
  const noteId = Number(result.lastInsertRowid);

  setTags(noteId, tags);
  for (const targetId of relatedIds) {
    if (targetId === noteId) continue;
    db.prepare("INSERT OR IGNORE INTO note_links (source_id, target_id, kind) VALUES (?, ?, 'recommended')")
      .run(noteId, targetId);
  }
  return getNote(noteId)!;
});

export const updateNoteTags = db.transaction((id: number, tags: string[]) => {
  setTags(id, tags);
  db.prepare("UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  return getNote(id);
});

export function linkNotes(sourceId: number, targetId: number) {
  if (sourceId === targetId) return getNote(sourceId);
  db.prepare(`
    INSERT INTO note_links (source_id, target_id, kind) VALUES (?, ?, 'manual')
    ON CONFLICT(source_id, target_id) DO UPDATE SET kind = 'manual'
  `).run(sourceId, targetId);
  return getNote(sourceId);
}

export function unlinkNotes(sourceId: number, targetId: number) {
  db.prepare("DELETE FROM note_links WHERE source_id = ? AND target_id = ?").run(sourceId, targetId);
  return getNote(sourceId);
}
