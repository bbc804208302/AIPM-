import type {
  DailyIntelligenceBrief,
  IntelligenceSignal,
  LlmReviewIssue,
  LlmReviewQualityReport,
  LlmReviewRunStatus,
} from "@/types/intelligence";
import { jsonrepair } from "jsonrepair";

const maximumItemsPerReview = 10;
const maximumItemsPerRequest = 3;
const maximumSourceTextLength = 1_200;
const initialReviewTokenLimit = 4_000;
const retryReviewTokenLimit = 6_000;

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

function hasFinalReview(item: IntelligenceSignal): boolean {
  return item.translationStatus === "reviewed" || item.translationStatus === "llm-reviewed";
}

function withLlmReviewQuality(
  brief: DailyIntelligenceBrief,
  report: LlmReviewQualityReport,
): DailyIntelligenceBrief {
  return { ...brief, quality: { ...brief.quality, llmReview: report } };
}

function runStatus(requestedItems: number, successfulItems: number): LlmReviewRunStatus {
  if (requestedItems === 0 || successfulItems === requestedItems) return "completed";
  if (successfulItems > 0) return "partial";
  return "failed";
}

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
  for (const candidate of [cleaned, (() => {
    try {
      return jsonrepair(cleaned);
    } catch {
      return "";
    }
  })()]) {
    if (!candidate) continue;
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (Array.isArray(parsed)) return { items: parsed };
      if (parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)) {
        return parsed as LlmReviewResponse;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function promptFor(itemsToReview: readonly IntelligenceSignal[], compact = false): string {
  const sourceTextLength = compact ? 600 : maximumSourceTextLength;
  const items = itemsToReview.map((item) => ({
    id: item.id,
    track: item.track,
    source: item.source,
    title: item.title,
    excerpt: item.summary.slice(0, sourceTextLength),
    pageDescription: typeof item.sourceMetadata.pageDescription === "string"
      ? item.sourceMetadata.pageDescription.slice(0, sourceTextLength)
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
    "必须输出且仅输出一个合法 JSON 对象，不要 Markdown、代码围栏或解释。所有输入 id 必须原样返回。格式：{\"items\":[{\"id\":\"...\",\"titleZh\":\"...\",\"summaryZh\":\"...\"}]}。",
    ...(compact ? ["这是格式修复重试：请缩短措辞，并在输出前确认 JSON 可被 JSON.parse 直接解析。"] : []),
    `输入：${JSON.stringify({ items })}`,
  ].join("\n");
}

function splitIntoBatches<T>(items: readonly T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
}

function readProviderMetadata(payload: unknown): { content: unknown; finishReason: string } {
  const choice = (payload as { choices?: Array<{ finish_reason?: unknown; message?: { content?: unknown } }> }).choices?.[0];
  return {
    content: choice?.message?.content,
    finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : "unknown",
  };
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
      if (hasFinalReview(item)) return item;
      const revision = reviewed.get(item.id);
      return revision ? { ...item, ...revision, translationStatus: "llm-reviewed" } : item;
    }),
  };
}

export function prepareBriefForLlmReview(
  collectedBrief: DailyIntelligenceBrief,
  previousBrief: DailyIntelligenceBrief | null,
): DailyIntelligenceBrief {
  const needsRepair = previousBrief?.briefingDate === collectedBrief.briefingDate
    && previousBrief.items.some((item) => !hasFinalReview(item));
  if (!needsRepair || !previousBrief) return collectedBrief;
  return {
    ...previousBrief,
    generatedAt: collectedBrief.generatedAt,
    sources: collectedBrief.sources,
  };
}

export async function reviewBriefWithLlm(
  brief: DailyIntelligenceBrief,
  environment: Environment = process.env,
  fetcher: FetchLike = fetch,
): Promise<DailyIntelligenceBrief> {
  const startedAt = Date.now();
  const config = readLlmReviewConfig(environment);
  const pendingItems = brief.items.filter((item) => !hasFinalReview(item)).slice(0, maximumItemsPerReview);
  if (!config) {
    if (brief.items.length > 0 && environment.SIGNALFLOW_LLM_REVIEW === "true" && !environment.LLM_API_KEY?.trim()) {
      console.warn("LLM review skipped: LLM_API_KEY is not configured.");
    } else if (brief.items.length > 0 && environment.LLM_API_KEY?.trim() && environment.SIGNALFLOW_LLM_REVIEW !== "true") {
      console.warn("LLM review skipped: SIGNALFLOW_LLM_REVIEW is not true.");
    }
    return withLlmReviewQuality(brief, {
      status: environment.SIGNALFLOW_LLM_REVIEW === "true" ? "not-configured" : "disabled",
      model: null,
      requestedItems: 0,
      successfulItems: 0,
      finalReviewedItems: brief.items.filter(hasFinalReview).length,
      pendingItems: brief.items.filter((item) => !hasFinalReview(item)).length,
      batchCount: 0,
      requestCount: 0,
      retryCount: 0,
      failedBatchCount: 0,
      durationMs: Date.now() - startedAt,
      issues: [],
    });
  }

  const batches = splitIntoBatches(pendingItems, maximumItemsPerRequest);
  let reviewedBrief = brief;
  let requestCount = 0;
  let retryCount = 0;
  const issues: LlmReviewIssue[] = [];

  for (const [batchIndex, batch] of batches.entries()) {
    const label = `batch ${batchIndex + 1}/${batches.length}`;
    let attempts = 0;
    try {
      let batchCompleted = false;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        attempts = attempt;
        requestCount += 1;
        if (attempt > 1) retryCount += 1;
        const response = await fetcher(`${config.apiBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            temperature: 0.1,
            max_tokens: attempt === 1 ? initialReviewTokenLimit : retryReviewTokenLimit,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "你是严谨的中文情报编辑。你的完整回复必须是可被 JSON.parse 直接解析的 JSON 对象。" },
              { role: "user", content: promptFor(batch, attempt > 1) },
            ],
          }),
        });
        if (!response.ok) {
          console.warn(`LLM review ${label} fallback: provider returned HTTP ${response.status}.`);
          issues.push({ batchIndex: batchIndex + 1, itemIds: batch.map((item) => item.id), code: "provider-http-error", attempts, httpStatus: response.status });
          break;
        }

        const payload: unknown = await response.json();
        const { content, finishReason } = readProviderMetadata(payload);
        if (typeof content !== "string") {
          console.warn(`LLM review ${label} fallback: provider response did not contain message content (finish_reason=${finishReason}).`);
          issues.push({ batchIndex: batchIndex + 1, itemIds: batch.map((item) => item.id), code: "missing-content", attempts, finishReason });
          break;
        }
        const parsed = parseJsonContent(content);
        if (!parsed) {
          const diagnostic = `finish_reason=${finishReason}, content_length=${content.length}`;
          if (attempt === 1) {
            console.warn(`LLM review ${label} retry: provider response was not valid JSON (${diagnostic}); retrying with a compact prompt.`);
            continue;
          }
          console.warn(`LLM review ${label} fallback: provider response was not valid JSON after retry (${diagnostic}).`);
          issues.push({ batchIndex: batchIndex + 1, itemIds: batch.map((item) => item.id), code: "invalid-json", attempts, finishReason, contentLength: content.length });
          break;
        }

        reviewedBrief = applyLlmItems(reviewedBrief, parsed);
        const missingItemIds = batch
          .filter((item) => !reviewedBrief.items.find((candidate) => candidate.id === item.id && hasFinalReview(candidate)))
          .map((item) => item.id);
        if (missingItemIds.length === 0) {
          batchCompleted = true;
          break;
        }
        if (attempt === 1) {
          console.warn(`LLM review ${label} retry: provider omitted ${missingItemIds.length} items; retrying with a compact prompt.`);
          continue;
        }
        issues.push({ batchIndex: batchIndex + 1, itemIds: missingItemIds, code: "incomplete-items", attempts, finishReason, contentLength: content.length });
        break;
      }
      if (!batchCompleted) continue;
    } catch (error) {
      console.warn(`LLM review ${label} fallback: ${error instanceof Error ? error.message.slice(0, 160) : "request failed"}.`);
      issues.push({ batchIndex: batchIndex + 1, itemIds: batch.map((item) => item.id), code: "request-error", attempts: Math.max(attempts, 1) });
    }
  }

  const reviewedCount = reviewedBrief.items.filter((item) => item.translationStatus === "llm-reviewed").length;
  const successfulItems = pendingItems.filter((item) => reviewedBrief.items.some((candidate) => candidate.id === item.id && hasFinalReview(candidate))).length;
  const finalReviewedItems = reviewedBrief.items.filter(hasFinalReview).length;
  console.info(`LLM review completed: ${reviewedCount}/${brief.items.length} items across ${batches.length} batches.`);
  return withLlmReviewQuality(reviewedBrief, {
    status: runStatus(pendingItems.length, successfulItems),
    model: config.model,
    requestedItems: pendingItems.length,
    successfulItems,
    finalReviewedItems,
    pendingItems: reviewedBrief.items.length - finalReviewedItems,
    batchCount: batches.length,
    requestCount,
    retryCount,
    failedBatchCount: new Set(issues.map((issue) => issue.batchIndex)).size,
    durationMs: Date.now() - startedAt,
    issues,
  });
}
