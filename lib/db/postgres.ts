import postgres from "postgres";
import type { Note, RelatedNote } from "@/lib/types";
import type { DbBackend } from "@/lib/db/backend";

type Sql = ReturnType<typeof postgres>;

// Reuse one pool across hot reloads in dev. `prepare: false` keeps us
// compatible with Supabase's transaction-mode connection pooler (PgBouncer),
// which does not support prepared statements.
const globalForDb = globalThis as unknown as { _nimbusSql?: Sql };
const sql: Sql = globalForDb._nimbusSql ?? postgres(process.env.DATABASE_URL as string, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb._nimbusSql = sql;

// Mirror SQLite's "YYYY-MM-DD HH:MM:SS" UTC string so the frontend date parser
// works unchanged across both backends.
const TS = (col: string) =>
  `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')`;

let schemaReady: Promise<void> | null = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name TEXT NOT NULL UNIQUE
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS note_tags (
          note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
          tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (note_id, tag_id)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS note_links (
          source_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
          target_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
          kind TEXT NOT NULL CHECK (kind IN ('manual', 'recommended')),
          PRIMARY KEY (source_id, target_id)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes (updated_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS note_links_target_idx ON note_links (target_id)`;
    })().catch((error) => {
      // Reset so the next call retries instead of caching a rejected promise.
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function getTags(db: Sql, noteId: number): Promise<string[]> {
  const rows = await db<{ name: string }[]>`
    SELECT tags.name FROM tags
    JOIN note_tags ON note_tags.tag_id = tags.id
    WHERE note_tags.note_id = ${noteId}
    ORDER BY tags.name
  `;
  return rows.map((row) => row.name);
}

async function getRelatedNotes(db: Sql, noteId: number): Promise<RelatedNote[]> {
  // Same undirected-link dedup as the SQLite backend: collapse both directions
  // into one related note, preferring 'manual'.
  const rows = await db<RelatedNote[]>`
    SELECT notes.id, notes.title,
      CASE WHEN MIN(CASE note_links.kind WHEN 'manual' THEN 0 ELSE 1 END) = 0
           THEN 'manual' ELSE 'recommended' END AS kind
    FROM note_links
    JOIN notes ON notes.id = CASE
      WHEN note_links.source_id = ${noteId} THEN note_links.target_id
      ELSE note_links.source_id
    END
    WHERE note_links.source_id = ${noteId} OR note_links.target_id = ${noteId}
    GROUP BY notes.id, notes.title, notes.updated_at
    ORDER BY kind, notes.updated_at DESC
  `;
  return rows;
}

type NoteRow = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

async function serialize(db: Sql, row: NoteRow): Promise<Note> {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: await getTags(db, row.id),
    relatedNotes: await getRelatedNotes(db, row.id),
  };
}

async function getNote(db: Sql, id: number): Promise<Note | null> {
  const [row] = await db<NoteRow[]>`
    SELECT id, title, content, ${db.unsafe(TS("created_at"))} AS created_at,
           ${db.unsafe(TS("updated_at"))} AS updated_at
    FROM notes WHERE id = ${id}
  `;
  return row ? serialize(db, row) : null;
}

async function setTags(db: Sql, noteId: number, tagNames: string[]) {
  const cleanTags = [...new Set(tagNames.map((tag) => tag.trim()).filter(Boolean))].slice(0, 8);
  await db`DELETE FROM note_tags WHERE note_id = ${noteId}`;
  for (const name of cleanTags) {
    await db`INSERT INTO tags (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
    const [tag] = await db<{ id: number }[]>`SELECT id FROM tags WHERE name = ${name}`;
    await db`INSERT INTO note_tags (note_id, tag_id) VALUES (${noteId}, ${tag.id}) ON CONFLICT DO NOTHING`;
  }
}

export const backend: DbBackend = {
  async listNotes() {
    await ensureSchema();
    const rows = await sql<NoteRow[]>`
      SELECT id, title, content, ${sql.unsafe(TS("created_at"))} AS created_at,
             ${sql.unsafe(TS("updated_at"))} AS updated_at
      FROM notes ORDER BY updated_at DESC, id DESC
    `;
    return Promise.all(rows.map((row) => serialize(sql, row)));
  },

  async getNote(id) {
    await ensureSchema();
    return getNote(sql, id);
  },

  async hasNote(id) {
    await ensureSchema();
    const [row] = await sql`SELECT 1 FROM notes WHERE id = ${id}`;
    return Boolean(row);
  },

  async createNote(content, tags, relatedIds) {
    await ensureSchema();
    return sql.begin(async (tx) => {
      const db = tx as unknown as Sql;
      const firstLine = content.split("\n").find((line) => line.trim()) ?? "未命名笔记";
      const title = firstLine.trim().slice(0, 42);
      const [created] = await db<{ id: number }[]>`
        INSERT INTO notes (title, content) VALUES (${title}, ${content.trim()}) RETURNING id
      `;
      const noteId = created.id;

      await setTags(db, noteId, tags);
      for (const targetId of relatedIds) {
        if (targetId === noteId) continue;
        await db`
          INSERT INTO note_links (source_id, target_id, kind)
          VALUES (${noteId}, ${targetId}, 'recommended')
          ON CONFLICT (source_id, target_id) DO NOTHING
        `;
      }
      return (await getNote(db, noteId)) as Note;
    }) as Promise<Note>;
  },

  async updateNoteTags(id, tags) {
    await ensureSchema();
    return sql.begin(async (tx) => {
      const db = tx as unknown as Sql;
      const [exists] = await db`SELECT 1 FROM notes WHERE id = ${id}`;
      if (!exists) return null;
      await setTags(db, id, tags);
      await db`UPDATE notes SET updated_at = now() WHERE id = ${id}`;
      return getNote(db, id);
    }) as Promise<Note | null>;
  },

  async linkNotes(sourceId, targetId) {
    await ensureSchema();
    if (sourceId === targetId) return getNote(sql, sourceId);
    return sql.begin(async (tx) => {
      const db = tx as unknown as Sql;
      // Drop any reverse-direction row so a manual link never coexists with a
      // recommended link for the same pair.
      await db`DELETE FROM note_links WHERE source_id = ${targetId} AND target_id = ${sourceId}`;
      await db`
        INSERT INTO note_links (source_id, target_id, kind) VALUES (${sourceId}, ${targetId}, 'manual')
        ON CONFLICT (source_id, target_id) DO UPDATE SET kind = 'manual'
      `;
      return getNote(db, sourceId);
    }) as Promise<Note | null>;
  },

  async unlinkNotes(sourceId, targetId) {
    await ensureSchema();
    await sql`
      DELETE FROM note_links
      WHERE (source_id = ${sourceId} AND target_id = ${targetId})
        OR (source_id = ${targetId} AND target_id = ${sourceId})
    `;
    return getNote(sql, sourceId);
  },
};
