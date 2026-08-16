import assert from "node:assert/strict";
import test from "node:test";

import { prepareBriefForLlmReview, readLlmReviewConfig, reviewBriefWithLlm } from "./llm-review";
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

function briefWithItems(count: number): DailyIntelligenceBrief {
  const template = brief.items[0];
  assert.ok(template);
  return {
    ...brief,
    items: Array.from({ length: count }, (_, index) => ({
      ...template,
      id: `SIG-${index + 1}`,
      title: `Source title ${index + 1}`,
    })),
  };
}

test("does not enable LLM review without an explicit flag and key", () => {
  assert.equal(readLlmReviewConfig({ LLM_API_KEY: "key" }), null);
  assert.equal(readLlmReviewConfig({ SIGNALFLOW_LLM_REVIEW: "true" }), null);
});

test("replaces generated copy only when the LLM returns valid item JSON", async () => {
  const fetcher = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ items: [{ id: "SIG-1", titleZh: "微短剧平台收入有望达到 10 亿美元", summaryZh: "报道关注微短剧平台的商业化规模。" }] }) } }] }), { status: 200 });
  const reviewed = await reviewBriefWithLlm(brief, { SIGNALFLOW_LLM_REVIEW: "true", LLM_API_KEY: "test-key", LLM_MODEL: "test-model" }, fetcher as typeof fetch);
  assert.equal(reviewed.items[0]?.titleZh, "微短剧平台收入有望达到 10 亿美元");
  assert.equal(reviewed.items[0]?.translationStatus, "llm-reviewed");
  assert.equal(reviewed.quality?.llmReview.status, "completed");
  assert.equal(reviewed.quality?.llmReview.successfulItems, 1);
});

test("keeps the deterministic brief when the LLM response is invalid", async () => {
  const fetcher = async () => new Response(JSON.stringify({ choices: [{ message: { content: "not json" } }] }), { status: 200 });
  const reviewed = await reviewBriefWithLlm(brief, { SIGNALFLOW_LLM_REVIEW: "true", LLM_API_KEY: "test-key" }, fetcher as typeof fetch);
  assert.deepEqual(reviewed.items, brief.items);
  assert.equal(reviewed.quality?.llmReview.status, "failed");
  assert.equal(reviewed.quality?.llmReview.retryCount, 1);
  assert.equal(reviewed.quality?.llmReview.issues[0]?.code, "invalid-json");
});

test("accepts JSON wrapped in provider commentary", async () => {
  const content = `结果如下：\n${JSON.stringify({ items: [{ id: "SIG-1", titleZh: "微短剧平台收入增长", summaryZh: "该平台通过移动端竖屏连续剧扩大付费内容规模，报道预计其收入有望达到 10 亿美元。" }] })}`;
  const fetcher = async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  const reviewed = await reviewBriefWithLlm(brief, { SIGNALFLOW_LLM_REVIEW: "true", LLM_API_KEY: "test-key" }, fetcher as typeof fetch);
  assert.equal(reviewed.items[0]?.translationStatus, "llm-reviewed");
});

test("repairs malformed provider JSON before falling back", async () => {
  const content = `{items:[{id:'SIG-1',titleZh:'微短剧平台收入增长',summaryZh:'该平台通过移动端竖屏连续剧扩大内容规模。',}],}`;
  const fetcher = async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  const reviewed = await reviewBriefWithLlm(brief, { SIGNALFLOW_LLM_REVIEW: "true", LLM_API_KEY: "test-key" }, fetcher as typeof fetch);
  assert.equal(reviewed.items[0]?.translationStatus, "llm-reviewed");
});

test("retries once with a compact prompt when JSON cannot be repaired", async () => {
  let requests = 0;
  const tokenLimits: number[] = [];
  const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => {
    requests += 1;
    const body = JSON.parse(String(init?.body)) as { max_tokens: number };
    tokenLimits.push(body.max_tokens);
    const content = requests === 1
      ? "not json"
      : JSON.stringify({ items: [{ id: "SIG-1", titleZh: "微短剧平台收入增长", summaryZh: "该平台通过移动端竖屏连续剧扩大内容规模。" }] });
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  };
  const reviewed = await reviewBriefWithLlm(brief, { SIGNALFLOW_LLM_REVIEW: "true", LLM_API_KEY: "test-key" }, fetcher as typeof fetch);
  assert.equal(requests, 2);
  assert.deepEqual(tokenLimits, [4_000, 6_000]);
  assert.equal(reviewed.items[0]?.translationStatus, "llm-reviewed");
  assert.equal(reviewed.quality?.llmReview.requestCount, 2);
  assert.equal(reviewed.quality?.llmReview.retryCount, 1);
});

test("reviews larger briefs in small batches", async () => {
  const input = briefWithItems(4);
  let requests = 0;
  const fetcher = async () => {
    requests += 1;
    const ids = requests === 1 ? ["SIG-1", "SIG-2", "SIG-3"] : ["SIG-4"];
    const items = ids.map((id) => ({ id, titleZh: `${id} 中文标题`, summaryZh: `${id} 的中文情报概述。` }));
    return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ items }) } }] }), { status: 200 });
  };

  const reviewed = await reviewBriefWithLlm(input, { SIGNALFLOW_LLM_REVIEW: "true", LLM_API_KEY: "test-key" }, fetcher as typeof fetch);

  assert.equal(requests, 2);
  assert.equal(reviewed.items.filter((item) => item.translationStatus === "llm-reviewed").length, 4);
  assert.equal(reviewed.quality?.llmReview.batchCount, 2);
  assert.equal(reviewed.quality?.llmReview.status, "completed");
});

test("keeps successful batches when another batch returns invalid JSON", async () => {
  const input = briefWithItems(4);
  let requests = 0;
  const fetcher = async () => {
    requests += 1;
    if (requests <= 2) {
      return new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: "not json" } }] }), { status: 200 });
    }
    const items = [{ id: "SIG-4", titleZh: "第四条中文标题", summaryZh: "第四条情报成功完成中文概述。" }];
    return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ items }) } }] }), { status: 200 });
  };

  const reviewed = await reviewBriefWithLlm(input, { SIGNALFLOW_LLM_REVIEW: "true", LLM_API_KEY: "test-key" }, fetcher as typeof fetch);

  assert.equal(requests, 3);
  assert.equal(reviewed.items[0]?.translationStatus, undefined);
  assert.equal(reviewed.items[3]?.translationStatus, "llm-reviewed");
  assert.equal(reviewed.quality?.llmReview.status, "partial");
  assert.equal(reviewed.quality?.llmReview.failedBatchCount, 1);
  assert.equal(reviewed.quality?.llmReview.successfulItems, 1);
});

test("records why LLM review was skipped without exposing credentials", async () => {
  const reviewed = await reviewBriefWithLlm(brief, { SIGNALFLOW_LLM_REVIEW: "true" });

  assert.equal(reviewed.quality?.llmReview.status, "not-configured");
  assert.equal(reviewed.quality?.llmReview.model, null);
  assert.equal(reviewed.quality?.llmReview.pendingItems, 1);
  assert.equal(JSON.stringify(reviewed.quality).includes("API_KEY"), false);
});

test("reuses today's unreviewed snapshot as the next LLM repair target", () => {
  const collected = { ...brief, items: [], generatedAt: "2026-08-09T01:00:00.000Z" };
  const target = prepareBriefForLlmReview(collected, brief);
  assert.equal(target.items.length, 1);
  assert.equal(target.generatedAt, collected.generatedAt);
});
