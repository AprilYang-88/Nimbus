import type { Note } from "@/lib/types";

type Analysis = {
  tags: string[];
  relatedNoteIds: number[];
  source: "llm" | "local";
};

// LLM config. Works with any OpenAI-compatible Chat Completions endpoint
// (OpenAI, 智谱 GLM, etc.). The legacy OPENAI_* names are still read so existing
// setups keep working.
const LLM_API_KEY = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
const LLM_BASE_URL = (
  process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4"
).replace(/\/+$/, "");
const LLM_MODEL = process.env.LLM_MODEL ?? process.env.OPENAI_MODEL ?? "glm-4-flash";

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

// Some models wrap JSON in ```json ... ``` fences even in JSON mode; strip them
// before parsing.
function stripJsonFences(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

async function llmAnalysis(content: string, notes: Note[]): Promise<Analysis> {
  const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你在整理一个人的学习笔记本。只输出一个 JSON 对象，" +
            '格式为 {"tags": string[], "relatedNoteIds": number[]}。' +
            "tags 给 2-4 个简洁的中文标签；relatedNoteIds 从用户提供的 existingNotes 里挑出最多 3 条" +
            "真正相关的笔记 id，不相关就返回空数组，绝不要编造不存在的 id。",
        },
        {
          role: "user",
          content: JSON.stringify({
            newNote: content,
            existingNotes: notes.map(({ id, title, tags }) => ({ id, title, tags })),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new Error("LLM response did not include any content");

  const parsed = JSON.parse(stripJsonFences(text)) as {
    tags?: unknown;
    relatedNoteIds?: unknown;
  };

  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
  if (!tags.length) throw new Error("LLM response did not include any tags");

  const allowedIds = new Set(notes.map((note) => note.id));
  const relatedNoteIds = Array.isArray(parsed.relatedNoteIds)
    ? parsed.relatedNoteIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && allowedIds.has(id))
    : [];

  return {
    tags: tags.slice(0, 4),
    relatedNoteIds: relatedNoteIds.slice(0, 3),
    source: "llm",
  };
}

export async function analyzeNote(content: string, notes: Note[]): Promise<Analysis> {
  if (!LLM_API_KEY) return localAnalysis(content, notes);

  try {
    return await llmAnalysis(content, notes);
  } catch (error) {
    console.error("Falling back to local note analysis", error);
    return localAnalysis(content, notes);
  }
}

