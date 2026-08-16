import type {
  DailyIntelligenceBrief,
  IntelligenceSignal,
  LlmReviewIssueCode,
  LlmReviewRunStatus,
} from "@/types/intelligence";

type IntelligenceTrack = DailyIntelligenceBrief["track"];

export interface IntelligenceQualityRun {
  track: IntelligenceTrack;
  label: string;
  briefingDate: string;
  generatedAt: string;
  status: LlmReviewRunStatus | "legacy";
  statusLabel: string;
  model: string | null;
  totalItems: number;
  reviewedItems: number;
  pendingItems: number;
  coveragePercent: number;
  batchCount: number;
  requestCount: number;
  retryCount: number;
  failedBatchCount: number;
  durationMs: number | null;
}

export interface IntelligenceQualityBadcase {
  id: string;
  title: string;
  source: string;
  track: IntelligenceTrack;
  trackLabel: string;
  issueLabel: string;
  batchLabel: string;
  attempts: number | null;
}

export interface IntelligenceQualitySummary {
  totalItems: number;
  reviewedItems: number;
  pendingItems: number;
  reviewCoveragePercent: number;
  sourceCount: number;
  successfulSources: number;
  sourceAvailabilityPercent: number;
  retryCount: number;
  failedBatchCount: number;
  latestGeneratedAt: string | null;
  runs: readonly IntelligenceQualityRun[];
  badcases: readonly IntelligenceQualityBadcase[];
}

const trackLabels: Record<IntelligenceTrack, string> = {
  technical: "AI 行业情报",
  domain: "业务领域情报",
};

const statusLabels: Record<LlmReviewRunStatus | "legacy", string> = {
  completed: "审校完成",
  partial: "部分完成",
  failed: "审校失败",
  disabled: "LLM 未启用",
  "not-configured": "LLM 未配置",
  legacy: "历史快照",
};

const issueLabels: Record<LlmReviewIssueCode, string> = {
  "provider-http-error": "模型服务返回 HTTP 错误",
  "missing-content": "模型未返回可用正文",
  "invalid-json": "模型输出无法解析为 JSON",
  "incomplete-items": "模型遗漏部分情报",
  "request-error": "模型请求异常",
};

function isReviewed(item: IntelligenceSignal): boolean {
  return item.translationStatus === "reviewed" || item.translationStatus === "llm-reviewed";
}

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function summarizeRun(brief: DailyIntelligenceBrief): IntelligenceQualityRun {
  const quality = brief.quality?.llmReview;
  const reviewedItems = quality?.finalReviewedItems ?? brief.items.filter(isReviewed).length;
  const pendingItems = quality?.pendingItems ?? Math.max(brief.items.length - reviewedItems, 0);
  const status = quality?.status ?? "legacy";

  return {
    track: brief.track,
    label: trackLabels[brief.track],
    briefingDate: brief.briefingDate,
    generatedAt: brief.generatedAt,
    status,
    statusLabel: statusLabels[status],
    model: quality?.model ?? null,
    totalItems: brief.items.length,
    reviewedItems,
    pendingItems,
    coveragePercent: percentage(reviewedItems, brief.items.length),
    batchCount: quality?.batchCount ?? 0,
    requestCount: quality?.requestCount ?? 0,
    retryCount: quality?.retryCount ?? 0,
    failedBatchCount: quality?.failedBatchCount ?? 0,
    durationMs: quality?.durationMs ?? null,
  };
}

function fallbackBadcase(brief: DailyIntelligenceBrief, item: IntelligenceSignal): IntelligenceQualityBadcase {
  return {
    id: item.id,
    title: item.titleZh ?? item.title,
    source: item.source,
    track: brief.track,
    trackLabel: trackLabels[brief.track],
    issueLabel: brief.quality ? "未获得完整 AI 审校结果" : "历史快照未记录具体失败原因",
    batchLabel: "—",
    attempts: null,
  };
}

function summarizeBadcases(brief: DailyIntelligenceBrief): readonly IntelligenceQualityBadcase[] {
  const pendingItems = brief.items.filter((item) => !isReviewed(item));
  const pendingById = new Map(pendingItems.map((item) => [item.id, item]));
  const recordedIds = new Set<string>();
  const badcases = (brief.quality?.llmReview.issues ?? []).flatMap((issue) =>
    issue.itemIds.flatMap((itemId) => {
      const item = pendingById.get(itemId);
      if (!item) return [];
      recordedIds.add(itemId);
      return [{
        id: item.id,
        title: item.titleZh ?? item.title,
        source: item.source,
        track: brief.track,
        trackLabel: trackLabels[brief.track],
        issueLabel: issueLabels[issue.code],
        batchLabel: `Batch ${issue.batchIndex}`,
        attempts: issue.attempts,
      } satisfies IntelligenceQualityBadcase];
    }),
  );

  return [
    ...badcases,
    ...pendingItems.filter((item) => !recordedIds.has(item.id)).map((item) => fallbackBadcase(brief, item)),
  ];
}

export function summarizeIntelligenceQuality(
  briefs: readonly (DailyIntelligenceBrief | null)[],
): IntelligenceQualitySummary {
  const availableBriefs = briefs.filter((brief): brief is DailyIntelligenceBrief => brief !== null);
  const runs = availableBriefs.map(summarizeRun);
  const totalItems = runs.reduce((total, run) => total + run.totalItems, 0);
  const reviewedItems = runs.reduce((total, run) => total + run.reviewedItems, 0);
  const sourceCount = availableBriefs.reduce((total, brief) => total + brief.sources.length, 0);
  const successfulSources = availableBriefs.reduce(
    (total, brief) => total + brief.sources.filter((source) => source.status === "success").length,
    0,
  );
  const timestamps = availableBriefs.map((brief) => Date.parse(brief.generatedAt)).filter(Number.isFinite);

  return {
    totalItems,
    reviewedItems,
    pendingItems: Math.max(totalItems - reviewedItems, 0),
    reviewCoveragePercent: percentage(reviewedItems, totalItems),
    sourceCount,
    successfulSources,
    sourceAvailabilityPercent: percentage(successfulSources, sourceCount),
    retryCount: runs.reduce((total, run) => total + run.retryCount, 0),
    failedBatchCount: runs.reduce((total, run) => total + run.failedBatchCount, 0),
    latestGeneratedAt: timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null,
    runs,
    badcases: availableBriefs.flatMap(summarizeBadcases),
  };
}
