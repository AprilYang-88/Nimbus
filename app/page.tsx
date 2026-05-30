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

  const selected = notes.find((note) => note.id === selectedId) ?? null;
  const availableLinks = useMemo(
    () => notes.filter((note) => note.id !== selectedId && !selected?.relatedNotes.some((item) => item.id === note.id)),
    [notes, selected, selectedId],
  );

  async function refresh() {
    const response = await fetch("/api/notes");
    const data = (await response.json()) as { notes: Note[] };
    setNotes(data.notes);
  }

  useEffect(() => {
    void refresh();
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
      setMessage(data.analysisSource === "openai" ? "AI 已完成整理。" : "已使用本地模式整理，可配置 API Key 开启 AI。");
    } else {
      setMessage(data.error ?? "保存失败，请稍后再试。");
    }
    setSaving(false);
  }

  async function saveTags() {
    if (!selected) return;
    await fetch(`/api/notes/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: tagDraft.split(",") }),
    });
    await refresh();
    setMessage("标签已更新。");
  }

  async function updateLink(method: "POST" | "DELETE", targetNoteId: number) {
    if (!selected) return;
    await fetch(`/api/notes/${selected.id}/links`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetNoteId }),
    });
    await refresh();
    setMessage(method === "POST" ? "已建立笔记连接。" : "已解除笔记连接。");
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">N</span><span>Nimbus</span></div>
        <div className="topbar-meta"><span className="status-dot" /> Local workspace</div>
      </header>

      <section className="hero">
        <p className="eyebrow">PERSONAL KNOWLEDGE STUDIO</p>
        <h1>让每一条记录，<br /><em>自然长出下一步。</em></h1>
        <p className="hero-copy">随手记下概念、工具和灵感。Nimbus 会自动整理标签，并从你的旧笔记中找到值得重新连接的线索。</p>
      </section>

      <section className="workspace">
        <form className="composer" onSubmit={submitNote}>
          <div className="composer-heading">
            <div>
              <p className="eyebrow">QUICK CAPTURE</p>
              <h2>此刻在想什么？</h2>
            </div>
            <span className="shortcut">⌘ Enter</span>
          </div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") event.currentTarget.form?.requestSubmit();
            }}
            placeholder="记下一个刚学到的概念，或者还没想明白的问题..."
            rows={5}
          />
          <div className="composer-footer">
            <p>{message}</p>
            <button className="primary" disabled={saving || !content.trim()}>{saving ? "整理中..." : "收进 Nimbus"}</button>
          </div>
        </form>

        <div className="section-title">
          <div><p className="eyebrow">RECENT NOTES</p><h2>知识流</h2></div>
          <span>{notes.length} 条笔记</span>
        </div>

        {notes.length === 0 ? (
          <div className="empty">
            <span>01</span>
            <h3>第一条笔记，从一个念头开始。</h3>
            <p>不需要先想好分类。记录下来，整理的事情交给 Nimbus。</p>
          </div>
        ) : (
          <div className="note-grid">
            {notes.map((note, index) => (
              <button className="note-card" key={note.id} onClick={() => setSelectedId(note.id)}>
                <div className="card-top"><span>{String(index + 1).padStart(2, "0")}</span><time>{formatDate(note.updatedAt)}</time></div>
                <h3>{note.title}</h3>
                <p>{note.content}</p>
                <div className="tags">{note.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className="card-bottom"><span>{note.relatedNotes.length} 个连接</span><b>↗</b></div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <aside className="drawer">
          <button className="close" onClick={() => setSelectedId(null)}>×</button>
          <p className="eyebrow">NOTE DETAILS</p>
          <h2>{selected.title}</h2>
          <time>{formatDate(selected.updatedAt)}</time>
          <p className="detail-content">{selected.content}</p>

          <section className="drawer-section">
            <h3>标签</h3>
            <div className="inline-form">
              <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder="用逗号分隔标签" />
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
                <button className="unlink" onClick={() => updateLink("DELETE", note.id)}>×</button>
              </div>
            ))}
            {availableLinks.length > 0 && (
              <div className="inline-form add-link">
                <select value={linkTarget} onChange={(event) => setLinkTarget(event.target.value)}>
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

