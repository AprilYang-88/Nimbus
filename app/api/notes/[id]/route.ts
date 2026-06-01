import { updateNoteTags } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { tags?: string[] };
  const noteId = Number(id);

  if (!Number.isSafeInteger(noteId) || noteId <= 0 || !Array.isArray(body.tags)) {
    return Response.json({ error: "标签格式不正确" }, { status: 400 });
  }

  const note = await updateNoteTags(noteId, body.tags);
  return note
    ? Response.json({ note })
    : Response.json({ error: "笔记不存在" }, { status: 404 });
}
