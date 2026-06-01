"use client";

import { useEffect, useMemo, useState } from "react";
import type { Note } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(`${value.replace(" ", "T")}Z`));
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [linkTarget, setLinkTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("写下一条笔记，Nimbus 会帮你找到连接。");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const selected = notes.find((note) => note.id === selectedId) ?? null;
  const availableLinks = useMemo(
    () => notes.filter((note) => note.id !== selectedId && !selected?.relatedNotes.some((item) => item.id === note.id)),
    [notes, selected, selectedId],
  );

  async function refresh() {
    const response = await fetch("/api/notes");
    const data = (await response.json()) as { notes: Note[] };
    if (!response.ok) throw new Error("读取笔记失败");
    setNotes(data.notes);
  }

  // First load gets explicit loading + error states so an empty grid is never
  // mistaken for "0 notes", and a failed fetch offers a retry instead of
  // silently looking like data loss.
  async function loadNotes() {
    setLoading(true);
    setLoadError(false);
    try {
      await refresh();
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotes();
  }, []);

  useEffect(() => {
    setTagDraft(selected?.tags.join(", ") ?? "");
    setLinkTarget("");
  }, [selectedId, selected?.tags.join("|")]);

  async function submitNote(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim() || saving) return;
    setSaving(true);
    setMessage("正在整理标签和关联笔记...");

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await response.json()) as { note?: Note; analysisSource?: string; error?: string };

      if (response.ok && data.note) {
        setContent("");
        await refresh();
        setSelectedId(data.note.id);
        setMessage(data.analysisSource === "local" ? "已使用本地模式整理，可配置 API Key 开启 AI。" : "AI 已完成整理。");
      } else {
        setMessage(data.error ?? "保存失败，请稍后再试。");
      }
    } catch {
      // Without this, a failed request would throw out of the handler and leave
      // `saving` stuck at true, permanently disabling the composer.
      setMessage("保存失败，请检查网络后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function saveTags() {
    if (!selected) return;
    try {
      const response = await fetch(`/api/notes/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: tagDraft.split(",") }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "标签更新失败");
      await refresh();
      setMessage("标签已更新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "标签更新失败，请稍后再试。");
    }
  }

  async function updateLink(method: "POST" | "DELETE", targetNoteId: number) {
    if (!selected) return;
    try {
      const response = await fetch(`/api/notes/${selected.id}/links`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetNoteId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "关联操作失败");
      await refresh();
      setMessage(method === "POST" ? "已建立笔记连接。" : "已解除笔记连接。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "关联操作失败，请稍后再试。");
    }
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">N</span><span>Nimbus</span></div>
        <div className="topbar-meta"><span className="status-dot" aria-hidden="true" /> Local workspace</div>
      </header>

      <section className="hero">
        <h1>让每一条记录，<br /><em>自然长出下一步。</em></h1>
        <p className="hero-copy">随手记下概念、工具和灵感。Nimbus 会自动整理标签，并从你的旧笔记中找到值得重新连接的线索。</p>
      </section>

      <section className="workspace">
        <form className="composer" onSubmit={submitNote}>
          <div className="composer-heading">
            <div>
              <p className="eyebrow">QUICK CAPTURE</p>
              <h2 id="composer-label">此刻在想什么？</h2>
            </div>
            <span className="shortcut">⌘ Enter</span>
          </div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") event.currentTarget.form?.requestSubmit();
            }}
            aria-labelledby="composer-label"
            aria-label="笔记内容"
            placeholder="记下一个刚学到的概念，或者还没想明白的问题..."
            rows={5}
          />
          <div className="composer-footer">
            <p role="status" aria-live="polite">{message}</p>
            <button className="primary" disabled={saving || !content.trim()}>{saving ? "整理中..." : "收进 Nimbus"}</button>
          </div>
        </form>

        <div className="section-title">
          <h2>知识流</h2>
          <span>{loading ? "加载中…" : `${notes.length} 条笔记`}</span>
        </div>

        {loading ? (
          <>
            <p className="sr-only" role="status">正在加载笔记…</p>
            <div className="note-grid" aria-hidden="true">
              {[0, 1, 2].map((i) => <div className="note-card skeleton" key={i} />)}
            </div>
          </>
        ) : loadError ? (
          <div className="empty" role="alert">
            <h3>笔记加载失败。</h3>
            <p>可能是网络中断。你的笔记仍然安全，重试即可。</p>
            <button className="primary" onClick={() => void loadNotes()}>重新加载</button>
          </div>
        ) : notes.length === 0 ? (
          <div className="empty">
            <h3>第一条笔记，从一个念头开始。</h3>
            <p>不需要先想好分类。记录下来，整理的事情交给 Nimbus。</p>
          </div>
        ) : (
          <div className="note-grid">
            {notes.map((note) => (
              <button className="note-card" key={note.id} onClick={() => setSelectedId(note.id)}>
                <div className="card-top"><time>{formatDate(note.updatedAt)}</time></div>
                <h3>{note.title}</h3>
                <p>{note.content}</p>
                <div className="tags">{note.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className="card-bottom"><span>{note.relatedNotes.length} 个连接</span><b aria-hidden="true">↗</b></div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <aside className="drawer" role="dialog" aria-modal="false" aria-labelledby="drawer-title">
          <button className="close" aria-label="关闭笔记详情" onClick={() => setSelectedId(null)}>×</button>
          <p className="eyebrow">NOTE DETAILS</p>
          <h2 id="drawer-title">{selected.title}</h2>
          <time>{formatDate(selected.updatedAt)}</time>
          <p className="detail-content">{selected.content}</p>

          <section className="drawer-section">
            <h3>标签</h3>
            <div className="inline-form">
              <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} aria-label="编辑标签，用逗号分隔" placeholder="用逗号分隔标签" />
              <button onClick={saveTags}>保存</button>
            </div>
          </section>

          <section className="drawer-section">
            <h3>相关笔记</h3>
            {selected.relatedNotes.length === 0 && <p className="muted">还没有关联笔记。</p>}
            {selected.relatedNotes.map((note) => (
              <div className="related" key={note.id}>
                <button onClick={() => setSelectedId(note.id)}>{note.title}</button>
                <span>{note.kind === "manual" ? "手动" : "推荐"}</span>
                <button className="unlink" aria-label={`解除与「${note.title}」的关联`} onClick={() => updateLink("DELETE", note.id)}>×</button>
              </div>
            ))}
            {availableLinks.length > 0 && (
              <div className="inline-form add-link">
                <select value={linkTarget} onChange={(event) => setLinkTarget(event.target.value)} aria-label="选择要关联的笔记">
                  <option value="">选择一条笔记...</option>
                  {availableLinks.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <button disabled={!linkTarget} onClick={() => updateLink("POST", Number(linkTarget))}>关联</button>
              </div>
            )}
          </section>
        </aside>
      )}
    </main>
  );
}
