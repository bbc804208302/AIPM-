import type { DailyIntelligenceBrief, IntelligenceCategory, IntelligenceSignal } from "@/types/intelligence";

import type { CollectorCategory, CollectorRunResult, CollectorTrack, IntelligenceCandidate } from "./types";
import { calculatePublicHeatScore } from "./heat-score";

const defaultTimezone = "Asia/Shanghai";
const categoryQuotas: Readonly<Record<CollectorCategory, number>> = {
  "ai-media": 4,
  "github-trending": 4,
  "x-viral": 2,
};
const categoryOrder: readonly CollectorCategory[] = ["ai-media", "github-trending", "x-viral"];

export interface DailyBriefOptions {
  dailyLimit?: number;
  timezone?: string;
  track?: CollectorTrack;
  lookbackDays?: number;
  historicalItems?: readonly IntelligenceSignal[];
}

function briefingDate(isoDate: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(isoDate));
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function recentBriefingDates(isoDate: string, timezone: string, lookbackDays: number): ReadonlySet<string> {
  const timestamp = Date.parse(isoDate);
  return new Set(Array.from({ length: lookbackDays }, (_, index) => briefingDate(
    new Date(timestamp - index * 24 * 60 * 60 * 1_000).toISOString(),
    timezone,
  )));
}

function isRecentSignal(signal: IntelligenceCandidate, allowedDates: ReadonlySet<string>, timezone: string): boolean {
  // GitHub Trending is a live daily ranking and does not expose a reliable publication timestamp.
  if (signal.category === "github-trending") return true;
  if (!signal.publishedAt) return false;
  return allowedDates.has(briefingDate(signal.publishedAt, timezone));
}

function normalizedTitleKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[\p{P}\p{S}\s]/gu, "")
    .trim();
}

function removePreviouslySeenSignals(
  signals: readonly IntelligenceCandidate[],
  historicalItems: readonly IntelligenceSignal[],
): readonly IntelligenceCandidate[] {
  const seenUrls = new Set(historicalItems.map((item) => item.url));
  const seenTitles = new Set(historicalItems.map((item) => normalizedTitleKey(item.title)).filter(Boolean));
  return signals.filter((signal) => {
    if (seenUrls.has(signal.canonicalUrl)) return false;
    const titleKey = normalizedTitleKey(signal.title);
    return !titleKey || !seenTitles.has(titleKey);
  });
}

function intelligenceCategory(signal: IntelligenceCandidate): IntelligenceCategory {
  const text = `${signal.title} ${signal.excerpt}`.toLowerCase();
  if (/\bagent\b|agentic|\bmcp\b/.test(text)) return "agent";
  if (/coding|code generation|copilot|developer tool/.test(text)) return "ai-coding";
  if (/image|video|audio|multimodal|diffusion|generative media/.test(text)) return "multimodal";
  if (/gpt|gemini|claude|llama|mistral|model|inference|reasoning/.test(text)) return "model-capability";
  if (/interface|interaction|workflow|canvas|voice ui/.test(text)) return "interaction";
  if (/pricing|subscription|revenue|business model|monetization/.test(text)) return "business-model";
  if (/launch|release|introducing|product|tool|feature|update/.test(text)) return "product";
  return "other";
}

function compareSignals(category: CollectorCategory, left: IntelligenceCandidate, right: IntelligenceCandidate): number {
  if (category === "ai-media") {
    const dateDifference = Date.parse(right.publishedAt ?? "1970-01-01") - Date.parse(left.publishedAt ?? "1970-01-01");
    if (dateDifference !== 0) return dateDifference;
    const trustOrder = { primary: 0, curated: 1, community: 2 } as const;
    return trustOrder[left.trustTier] - trustOrder[right.trustTier];
  }
  return (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);
}

function selectDailySignals(signals: readonly IntelligenceCandidate[], limit: number): readonly IntelligenceCandidate[] {
  const buckets = new Map(categoryOrder.map((category) => [
    category,
    signals.filter((signal) => signal.category === category).sort((a, b) => compareSignals(category, a, b)),
  ]));
  const selected: IntelligenceCandidate[] = [];
  const selectedIds = new Set<string>();

  while (selected.length < limit) {
    let added = false;
    for (const category of categoryOrder) {
      const used = selected.filter((signal) => signal.category === category).length;
      if (used >= categoryQuotas[category]) continue;
      const next = buckets.get(category)?.shift();
      if (!next) continue;
      selected.push(next);
      selectedIds.add(next.id);
      added = true;
      if (selected.length >= limit) break;
    }
    if (!added) break;
  }

  if (selected.length < limit) {
    const remaining = signals
      .filter((signal) => !selectedIds.has(signal.id))
      .sort((left, right) => {
        const categoryDifference = categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category);
        return categoryDifference || compareSignals(left.category, left, right);
      });
    selected.push(...remaining.slice(0, limit - selected.length));
  }

  return selected;
}

function selectionReason(signal: IntelligenceCandidate): string {
  if (signal.track === "domain") return signal.trustTier === "primary" ? "业务领域一手来源近 3 日更新" : "业务领域公开来源近 3 日更新";
  if (signal.category === "github-trending") return `GitHub Trending 今日排名 #${signal.rank ?? "—"}`;
  if (signal.category === "x-viral") return `AttentionVC AI 近 3 日信号 #${signal.rank ?? "—"}`;
  return signal.trustTier === "primary" ? "官方 AI 来源近 3 日更新" : "AI 媒体近 3 日更新";
}

function toIntelligenceSignal(signal: IntelligenceCandidate, date: string): IntelligenceSignal {
  return {
    id: signal.id,
    briefingDate: date,
    track: signal.track,
    title: signal.title,
    sourceId: signal.sourceId,
    source: signal.sourceName,
    sourceGroup: signal.category,
    sourceType: signal.sourceType,
    trustTier: signal.trustTier,
    category: intelligenceCategory(signal),
    summary: signal.excerpt,
    url: signal.canonicalUrl,
    publishedAt: signal.publishedAt,
    collectedAt: signal.collectedAt,
    sourceRank: signal.rank,
    sourceMetadata: signal.metadata,
    selectionReason: selectionReason(signal),
    heatScore: calculatePublicHeatScore(signal.category, signal.metadata),
    impactScore: null,
    noveltyScore: null,
    productInsight: null,
    createdAt: signal.collectedAt,
    highValue: false,
    readStatus: "未读",
    convertedToDemand: false,
  };
}

export function buildDailyIntelligenceBrief(
  result: CollectorRunResult,
  options: DailyBriefOptions = {},
): DailyIntelligenceBrief {
  const dailyLimit = options.dailyLimit ?? 10;
  const timezone = options.timezone ?? defaultTimezone;
  const track = options.track ?? "technical";
  const lookbackDays = options.lookbackDays ?? 3;
  const date = briefingDate(result.finishedAt, timezone);
  const trackSignals = result.signals.filter((signal) => signal.track === track);
  const allowedDates = recentBriefingDates(result.finishedAt, timezone, lookbackDays);
  const recentSignals = trackSignals.filter((signal) => isRecentSignal(signal, allowedDates, timezone));
  const unseenSignals = removePreviouslySeenSignals(recentSignals, options.historicalItems ?? []);
  const items = selectDailySignals(unseenSignals, dailyLimit).map((signal) => toIntelligenceSignal(signal, date));

  return {
    schemaVersion: 1,
    briefingDate: date,
    timezone,
    track,
    generatedAt: result.finishedAt,
    candidateCount: unseenSignals.length,
    dailyLimit,
    items,
    sources: result.sources,
  };
}
