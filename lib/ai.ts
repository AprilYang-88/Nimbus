import type { Note } from "@/lib/types";

type Analysis = {
  tags: string[];
  relatedNoteIds: number[];
  source: "openai" | "local";
};

const stopWords = new Set([
  "this", "that", "with", "from", "have", "will", "about", "into", "when",
  "what", "where", "which", "一个", "可以", "需要", "以及", "如何", "什么",
  "这个", "进行", "使用", "通过", "因为", "如果", "笔记", "学习",
]);

// ICU-backed word segmentation (built into Node via Intl) so Chinese is split
// into real words instead of arbitrary fixed-length character chunks. The old
// /[\u4e00-\u9fff]{2,6}/ regex sliced a long run like "\u67b6\u6784\u662f\u73b0\u4ee3\u5927\u8bed\u8a00\u6a21\u578b\u7684\u57fa\u7840"
// into meaningless 6-char fragments ("\u67b6\u6784\u662f\u73b0\u4ee3\u5927", "\u8bed\u8a00\u6a21\u578b\u7684\u57fa").
const segmenter = new Intl.Segmenter("zh", { granularity: "word" });

function terms(text: string) {
  const out: string[] = [];
  for (const { segment, isWordLike } of segmenter.segment(text.toLowerCase())) {
    if (!isWordLike) continue;
    const word = segment.trim();
    if (!word || stopWords.has(word)) continue;
    // Drop single-character CJK particles (\u7684/\u662f/\u4e86\u2026) and very short Latin tokens.
    const isCJK = /[\u4e00-\u9fff]/.test(word);
    if (isCJK ? word.length < 2 : word.length < 3) continue;
    out.push(word);
  }
  return out;
}

function localAnalysis(content: string, notes: Note[]): Analysis {
  const words = terms(content);
  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const tags = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .map(([word]) => word)
    .slice(0, 4);

  const queryTerms = new Set(words);
  const relatedNoteIds = notes
    .map((note) => {
      const noteTerms = terms(`${note.title} ${note.content} ${note.tags.join(" ")}`);
      const overlap = noteTerms.filter((word) => queryTerms.has(word)).length;
      return { id: note.id, score: overlap };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ id }) => id);

  return {
    tags: tags.length ? tags : ["待整理"],
    relatedNoteIds,
    source: "local",
  };
}

function parseOutputText(payload: unknown) {
  const response = payload as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  return response.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")?.text;
}

async function openaiAnalysis(content: string, notes: Note[]): Promise<Analysis> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      input: [
        {
          role: "system",
          content:
            "You organize a personal learning notebook. Return 2-4 concise Chinese tags and up to 3 IDs of genuinely related existing notes. Never invent IDs.",
        },
        {
          role: "user",
          content: JSON.stringify({
            newNote: content,
            existingNotes: notes.map(({ id, title, tags }) => ({ id, title, tags })),
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "nimbus_note_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tags: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
              relatedNoteIds: { type: "array", items: { type: "integer" }, maxItems: 3 },
            },
            required: ["tags", "relatedNoteIds"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const text = parseOutputText(await response.json());
  if (!text) throw new Error("OpenAI response did not include output text");

  const parsed = JSON.parse(text) as Omit<Analysis, "source">;
  const allowedIds = new Set(notes.map((note) => note.id));

  return {
    tags: parsed.tags.slice(0, 4),
    relatedNoteIds: parsed.relatedNoteIds.filter((id) => allowedIds.has(id)).slice(0, 3),
    source: "openai",
  };
}

export async function analyzeNote(content: string, notes: Note[]): Promise<Analysis> {
  if (!process.env.OPENAI_API_KEY) return localAnalysis(content, notes);

  try {
    return await openaiAnalysis(content, notes);
  } catch (error) {
    console.error("Falling back to local note analysis", error);
    return localAnalysis(content, notes);
  }
}

