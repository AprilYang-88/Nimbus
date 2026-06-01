import { analyzeNote } from "@/lib/ai";
import { createNote, listNotes } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ notes: await listNotes() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { content?: string };
  const content = body.content?.trim();

  if (!content) {
    return Response.json({ error: "请输入笔记内容" }, { status: 400 });
  }

  const analysis = await analyzeNote(content, await listNotes());
  const note = await createNote(content, analysis.tags, analysis.relatedNoteIds);
  return Response.json({ note, analysisSource: analysis.source }, { status: 201 });
}

