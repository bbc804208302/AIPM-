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
  const unfenced = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
  const firstBrace = unfenced.indexOf("{");
  const lastBrace = unfenced.lastIndexOf("}");
  const cleaned = firstBrace >= 0 && lastBrace > firstBrace ? unfenced.slice(firstBrace, lastBrace + 1) : unfenced;
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { items?: unknown }).items)) return null;
    return parsed as LlmReviewResponse;
  } catch {
    return null;
  }
}

function promptFor(brief: DailyIntelligenceBrief): string {
  const items = brief.items.filter((item) => item.translationStatus !== "reviewed").slice(0, maximumItemsPerReview).map((item) => ({
    id: item.id,
    track: item.track,
    source: item.source,
    title: item.title,
    excerpt: item.summary.slice(0, maximumSourceTextLength),
    pageDescription: typeof item.sourceMetadata.pageDescription === "string"
      ? item.sourceMetadata.pageDescription.slice(0, maximumSourceTextLength)
      : "",
  }));

  return [
    "输出语言：仅中文。",
    "你是 SignalFlow 的严谨中文情报编辑。只能依据 source、title、excerpt、pageDescription 生成可验证的 titleZh 和 summaryZh。",
    "共同规则：标题尽量不超过 30 个中文字符，保留产品名、项目名、机构名和关键数字；摘要使用一句高信息密度中文，直接解释情报本身，不解释入榜原因。",
    "GitHub Trending：摘要使用 60–120 个中文字符，说明项目具体做什么、解决什么问题；仅在证据支持时补充技术方法、目标用户或典型场景。不要以“这是一个”开头。",
    "AI 媒体与业务领域 RSS：摘要使用 50–100 个中文字符，概括本次事件、产品能力、行业变化或制作流程；保留关键实体和数字，不做逐字硬译。",
    "X 动态：摘要使用 60–100 个中文字符，以 excerpt 和 pageDescription 为事实来源，说明分享的工具、方法、发布内容或关键结论，不复述吸睛标题。",
    "参考风格：‘个人 AI 超级智能助手，强调私密性、简洁性与强大功能。’‘面向 Claude Code 的学术研究技能包，覆盖研究、写作、审阅、修订到定稿全流程。’",
    "禁止出现：某来源发布新动态、发布了内容更新、这是一则、该文章介绍、值得产品经理关注、具体以原文为准、以项目说明为准、入选、排名。",
    "不得补充证据中没有的数字、能力、因果、技术方案或产品结论。业务领域内容不必强行描述为 AI 新闻。信息不足时宁可写短，不得用空泛模板填充。",
    "信息不足、无法可靠判断时，titleZh 保留准确翻译后的原始标题，summaryZh 写“来源提供的信息有限，暂无法形成可靠中文概述。”",
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
      if (item.translationStatus === "reviewed") return item;
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
  if (!config || brief.items.length === 0) {
    if (brief.items.length > 0 && environment.SIGNALFLOW_LLM_REVIEW === "true" && !environment.LLM_API_KEY?.trim()) {
      console.warn("LLM review skipped: LLM_API_KEY is not configured.");
    } else if (brief.items.length > 0 && environment.LLM_API_KEY?.trim() && environment.SIGNALFLOW_LLM_REVIEW !== "true") {
      console.warn("LLM review skipped: SIGNALFLOW_LLM_REVIEW is not true.");
    }
    return brief;
  }

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
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你是严谨的中文情报编辑，只能输出 JSON。" },
          { role: "user", content: promptFor(brief) },
        ],
      }),
    });
    if (!response.ok) {
      console.warn(`LLM review fallback: provider returned HTTP ${response.status}.`);
      return brief;
    }

    const payload: unknown = await response.json();
    const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.warn("LLM review fallback: provider response did not contain message content.");
      return brief;
    }
    const parsed = parseJsonContent(content);
    if (!parsed) {
      console.warn("LLM review fallback: provider response was not valid JSON.");
      return brief;
    }
    const reviewed = applyLlmItems(brief, parsed);
    const reviewedCount = reviewed.items.filter((item) => item.translationStatus === "llm-reviewed").length;
    console.info(`LLM review completed: ${reviewedCount}/${brief.items.length} items.`);
    return reviewed;
  } catch (error) {
    console.warn(`LLM review fallback: ${error instanceof Error ? error.message.slice(0, 160) : "request failed"}.`);
    return brief;
  }
}
