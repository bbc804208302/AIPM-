import assert from "node:assert/strict";
import test from "node:test";

import { summarizeIntelligenceQuality } from "./summarize-intelligence-quality";
import type { DailyIntelligenceBrief, IntelligenceSignal } from "@/types/intelligence";

const item: IntelligenceSignal = {
  id: "SIG-1", briefingDate: "2026-08-16", track: "technical", title: "Agent release", sourceId: "source", source: "AI Source", sourceGroup: "ai-media", sourceType: "rss", trustTier: "curated", category: "product", summary: "Summary", url: "https://example.com/agent", publishedAt: "2026-08-16T00:00:00.000Z", collectedAt: "2026-08-16T01:00:00.000Z", sourceRank: null, sourceMetadata: {}, selectionReason: "Recent", impactScore: null, noveltyScore: null, productInsight: null, createdAt: "2026-08-16T01:00:00.000Z", highValue: false, readStatus: "未读", convertedToDemand: false,
};

function createBrief(overrides: Partial<DailyIntelligenceBrief> = {}): DailyIntelligenceBrief {
  return {
    schemaVersion: 1,
    briefingDate: "2026-08-16",
    timezone: "Asia/Shanghai",
    track: "technical",
    generatedAt: "2026-08-16T01:00:00.000Z",
    candidateCount: 10,
    dailyLimit: 10,
    items: [item, { ...item, id: "SIG-2", title: "Second signal", url: "https://example.com/second", translationStatus: "llm-reviewed" }],
    sources: [{ sourceId: "source", sourceName: "AI Source", status: "success", collected: 2, durationMs: 120 }],
    ...overrides,
  };
}

test("summarizes persisted LLM review telemetry and badcases", () => {
  const brief = createBrief({
    quality: {
      llmReview: {
        status: "partial",
        model: "deepseek-chat",
        requestedItems: 2,
        successfulItems: 1,
        finalReviewedItems: 1,
        pendingItems: 1,
        batchCount: 1,
        requestCount: 2,
        retryCount: 1,
        failedBatchCount: 1,
        durationMs: 1200,
        issues: [{ batchIndex: 1, itemIds: ["SIG-1"], code: "invalid-json", attempts: 2 }],
      },
    },
  });

  const summary = summarizeIntelligenceQuality([brief, null]);

  assert.equal(summary.reviewCoveragePercent, 50);
  assert.equal(summary.sourceAvailabilityPercent, 100);
  assert.equal(summary.retryCount, 1);
  assert.equal(summary.failedBatchCount, 1);
  assert.equal(summary.runs[0]?.statusLabel, "部分完成");
  assert.equal(summary.badcases[0]?.issueLabel, "模型输出无法解析为 JSON");
  assert.equal(summary.badcases[0]?.title, "Agent release");
});

test("supports legacy snapshots without quality telemetry", () => {
  const summary = summarizeIntelligenceQuality([createBrief()]);

  assert.equal(summary.reviewedItems, 1);
  assert.equal(summary.pendingItems, 1);
  assert.equal(summary.runs[0]?.status, "legacy");
  assert.equal(summary.badcases[0]?.issueLabel, "历史快照未记录具体失败原因");
});
