import type { DailyIntelligenceBrief, IntelligenceSignal } from "@/types/intelligence";

const maximumItemsPerReview = 10;
const maximumSourceTextLength = 1_200;

interface LlmReviewConfig {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
}

interface LlmReviewResponse {
  items: Array<{
    id?: unknown;
    titleZh?: unknown;
    summaryZh?: unknown;
  }>;
}

type FetchLike = typeof fetch;
type Environment = Readonly<Record<string, string | undefined>>;

function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function cleanText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maximumLength);
}

function parseJsonContent(content: string): LlmReviewResponse | null {
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { items?: unknown }).items)) return null;
    return parsed as LlmReviewResponse;
  } catch {
    return null;
  }
}

function promptFor(brief: DailyIntelligenceBrief): string {
  const items = brief.items.slice(0, maximumItemsPerReview).map((item) => ({
    id: item.id,
    track: item.track,
    source: item.source,
    title: item.title,
    excerpt: item.summary.slice(0, maximumSourceTextLength),
  }));

  return [
    "你是 SignalFlow 的中文情报编辑。仅根据每条提供的 source、title、excerpt，生成可验证、简洁的中文标题和中文概述。",
    "中文标题要直接回答“这是什么或发生了什么”，禁止使用“某来源发布新动态”“内容更新”等空泛句式。",
    "中文概述用 1–2 句说明内容、能力、流程或行业事件；不得补充原文没有的数字、能力、因果或产品结论。",
    "业务领域情报可以是短剧、动漫、影视、AIGC 制作或行业流程，并不必强行描述为 AI 新闻。",
    "原文信息不足、无法可靠判断时，titleZh 写“原文信息待审校”，summaryZh 写“来源摘要信息有限，请通过原文核对具体内容。”",
    "只输出合法 JSON，不要 Markdown，不要解释。格式：{\"items\":[{\"id\":\"...\",\"titleZh\":\"...\",\"summaryZh\":\"...\"}]}。",
    `输入：${JSON.stringify({ items })}`,
  ].join("\n");
}

export function readLlmReviewConfig(environment: Environment = process.env): LlmReviewConfig | null {
  if (environment.SIGNALFLOW_LLM_REVIEW !== "true") return null;
  const apiKey = environment.LLM_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    apiBaseUrl: normalizeApiBaseUrl(environment.LLM_API_BASE_URL?.trim() || "https://api.openai.com/v1"),
    model: environment.LLM_MODEL?.trim() || "gpt-4.1-mini",
  };
}

function applyLlmItems(brief: DailyIntelligenceBrief, response: LlmReviewResponse): DailyIntelligenceBrief {
  const reviewed = new Map<string, Pick<IntelligenceSignal, "titleZh" | "summaryZh">>();
  for (const item of response.items) {
    const id = cleanText(item.id, 120);
    const titleZh = cleanText(item.titleZh, 120);
    const summaryZh = cleanText(item.summaryZh, 320);
    if (id && titleZh && summaryZh) reviewed.set(id, { titleZh, summaryZh });
  }

  return {
    ...brief,
    items: brief.items.map((item) => {
      const revision = reviewed.get(item.id);
      return revision ? { ...item, ...revision, translationStatus: "llm-reviewed" } : item;
    }),
  };
}

export async function reviewBriefWithLlm(
  brief: DailyIntelligenceBrief,
  environment: Environment = process.env,
  fetcher: FetchLike = fetch,
): Promise<DailyIntelligenceBrief> {
  const config = readLlmReviewConfig(environment);
  if (!config || brief.items.length === 0) return brief;

  try {
    const response = await fetcher(`${config.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.1,
        max_tokens: 2_500,
        messages: [
          { role: "system", content: "你是严谨的中文情报编辑，只能输出 JSON。" },
          { role: "user", content: promptFor(brief) },
        ],
      }),
    });
    if (!response.ok) return brief;

    const payload: unknown = await response.json();
    const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;
    if (typeof content !== "string") return brief;
    const parsed = parseJsonContent(content);
    return parsed ? applyLlmItems(brief, parsed) : brief;
  } catch {
    return brief;
  }
}
