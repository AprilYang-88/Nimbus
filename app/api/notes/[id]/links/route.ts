import { linkNotes, unlinkNotes } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { targetNoteId?: number };
  const note = linkNotes(Number(id), Number(body.targetNoteId));
  return note
    ? Response.json({ note })
    : Response.json({ error: "笔记不存在" }, { status: 404 });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { targetNoteId?: number };
  const note = unlinkNotes(Number(id), Number(body.targetNoteId));
  return note
    ? Response.json({ note })
    : Response.json({ error: "笔记不存在" }, { status: 404 });
}

