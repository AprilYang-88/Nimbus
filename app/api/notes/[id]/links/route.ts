import { hasNote, linkNotes, unlinkNotes } from "@/lib/db";

export const runtime = "nodejs";

function parseNoteId(value: unknown) {
  const id = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { targetNoteId?: number };
  const sourceId = parseNoteId(id);
  const targetId = parseNoteId(body.targetNoteId);

  if (!sourceId || !targetId || sourceId === targetId) {
    return Response.json({ error: "关联笔记参数不正确" }, { status: 400 });
  }
  if (!hasNote(sourceId) || !hasNote(targetId)) {
    return Response.json({ error: "笔记不存在" }, { status: 404 });
  }

  return Response.json({ note: linkNotes(sourceId, targetId) });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { targetNoteId?: number };
  const sourceId = parseNoteId(id);
  const targetId = parseNoteId(body.targetNoteId);

  if (!sourceId || !targetId || sourceId === targetId) {
    return Response.json({ error: "关联笔记参数不正确" }, { status: 400 });
  }
  if (!hasNote(sourceId) || !hasNote(targetId)) {
    return Response.json({ error: "笔记不存在" }, { status: 404 });
  }

  return Response.json({ note: unlinkNotes(sourceId, targetId) });
}
