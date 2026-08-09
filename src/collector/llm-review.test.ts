import assert from "node:assert/strict";
import test from "node:test";

import { readLlmReviewConfig, reviewBriefWithLlm } from "./llm-review";
import type { DailyIntelligenceBrief } from "@/types/intelligence";

const brief: DailyIntelligenceBrief = {
  schemaVersion: 1,
  briefingDate: "2026-08-09",
  timezone: "Asia/Shanghai",
  track: "domain",
  generatedAt: "2026-08-09T00:00:00.000Z",
  candidateCount: 1,
  dailyLimit: 10,
  sources: [],
  items: [{
    id: "SIG-1", briefingDate: "2026-08-09", track: "domain", title: "Microdrama platform on track to earn $1B", sourceId: "microdrama", source: "Google News · Microdrama", sourceGroup: "ai-media", sourceType: "rss", trustTier: "curated", category: "business-model", summary: "A microdrama platform is on track to earn $1B.", url: "https://example.com", publishedAt: null, collectedAt: "2026-08-09T00:00:00.000Z", sourceRank: null, sourceMetadata: {}, selectionReason: "业务领域公开来源近期更新", impactScore: null, noveltyScore: null, productInsight: null, createdAt: "2026-08-09T00:00:00.000Z", highValue: false, readStatus: "未读", convertedToDemand: false,
  }],
};

test("does not enable LLM review without an explicit flag and key", () => {
  assert.equal(readLlmReviewConfig({ LLM_API_KEY: "key" }), null);
  assert.equal(readLlmReviewConfig({ SIGNALFLOW_LLM_REVIEW: "true" }), null);
});

test("replaces generated copy only when the LLM returns valid item JSON", async () => {
  const fetcher = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ items: [{ id: "SIG-1", titleZh: "微短剧平台收入有望达到 10 亿美元", summaryZh: "报道关注微短剧平台的商业化规模。" }] }) } }] }), { status: 200 });
  const reviewed = await reviewBriefWithLlm(brief, { SIGNALFLOW_LLM_REVIEW: "true", LLM_API_KEY: "test-key", LLM_MODEL: "test-model" }, fetcher as typeof fetch);
  assert.equal(reviewed.items[0]?.titleZh, "微短剧平台收入有望达到 10 亿美元");
  assert.equal(reviewed.items[0]?.translationStatus, "llm-reviewed");
});

test("keeps the deterministic brief when the LLM response is invalid", async () => {
  const fetcher = async () => new Response(JSON.stringify({ choices: [{ message: { content: "not json" } }] }), { status: 200 });
  const reviewed = await reviewBriefWithLlm(brief, { SIGNALFLOW_LLM_REVIEW: "true", LLM_API_KEY: "test-key" }, fetcher as typeof fetch);
  assert.equal(reviewed, brief);
});

test("accepts JSON wrapped in provider commentary", async () => {
  const content = `结果如下：\n${JSON.stringify({ items: [{ id: "SIG-1", titleZh: "微短剧平台收入增长", summaryZh: "该平台通过移动端竖屏连续剧扩大付费内容规模，报道预计其收入有望达到 10 亿美元。" }] })}`;
  const fetcher = async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  const reviewed = await reviewBriefWithLlm(brief, { SIGNALFLOW_LLM_REVIEW: "true", LLM_API_KEY: "test-key" }, fetcher as typeof fetch);
  assert.equal(reviewed.items[0]?.translationStatus, "llm-reviewed");
});
