import assert from "node:assert/strict";
import test from "node:test";

import { runOpportunityTriageAgent } from "./opportunity-triage-agent";
import type { IntelligenceRepository } from "@/repositories/intelligence-repository";
import type { OpportunityAgentRepository } from "@/repositories/opportunity-agent-repository";
import type { OpportunityTriageRun } from "@/types/agent";
import type { DailyIntelligenceBrief, IntelligenceSignal } from "@/types/intelligence";

const signals: readonly IntelligenceSignal[] = [
  {
    id: "SIG-NEW", briefingDate: "2026-08-16", track: "technical", title: "Agent evaluation tool", titleZh: "Agent 评测工具", sourceId: "github", source: "GitHub Trending", sourceGroup: "github-trending", sourceType: "scrape", trustTier: "community", category: "agent", summary: "Evaluates agent workflows", summaryZh: "用于评测 Agent 工作流质量。", translationStatus: "llm-reviewed", url: "https://example.com/new", publishedAt: "2026-08-16T00:00:00.000Z", collectedAt: "2026-08-16T01:00:00.000Z", sourceRank: 1, sourceMetadata: { starsToday: "2000 stars today" }, selectionReason: "Trending", heatScore: 85, impactScore: null, noveltyScore: null, productInsight: null, createdAt: "2026-08-16T01:00:00.000Z", highValue: false, readStatus: "未读", convertedToDemand: false,
  },
  {
    id: "SIG-OLD", briefingDate: "2026-08-16", track: "domain", title: "Existing video workflow", titleZh: "既有视频工作流", sourceId: "rss", source: "Industry RSS", sourceGroup: "ai-media", sourceType: "rss", trustTier: "curated", category: "product", summary: "An existing workflow update", summaryZh: "已有视频工作流的小幅更新。", translationStatus: "llm-reviewed", url: "https://example.com/old", publishedAt: "2026-08-16T00:00:00.000Z", collectedAt: "2026-08-16T01:00:00.000Z", sourceRank: null, sourceMetadata: {}, selectionReason: "Recent", heatScore: null, impactScore: null, noveltyScore: null, productInsight: null, createdAt: "2026-08-16T01:00:00.000Z", highValue: false, readStatus: "未读", convertedToDemand: false,
  },
];

function brief(track: "technical" | "domain", items: readonly IntelligenceSignal[]): DailyIntelligenceBrief {
  return { schemaVersion: 1, briefingDate: "2026-08-16", timezone: "Asia/Shanghai", track, generatedAt: "2026-08-16T01:00:00.000Z", candidateCount: items.length, dailyLimit: 10, items, sources: [] };
}

function repositories() {
  const savedTriageRuns: OpportunityTriageRun[] = [];
  const intelligenceRepository: IntelligenceRepository = {
    getLatestBrief: async (track) => track === "technical" ? brief(track, [signals[0]]) : brief(track, [signals[1]]),
    getBrief: async () => null, getSeenItems: async () => [], saveBrief: async () => undefined,
    findById: async (id) => signals.find((signal) => signal.id === id) ?? null,
  };
  const agentRepository: OpportunityAgentRepository = {
    listRuns: async () => [], saveRun: async () => undefined,
    listTriageRuns: async () => savedTriageRuns,
    saveTriageRun: async (run) => { savedTriageRuns.push(run); },
    searchMemory: async (query) => query.includes("既有")
      ? [{ runId: "RUN-OLD", signalTitle: "视频工作流", decision: "proposal", summary: "相同工作流已经分析", createdAt: "2026-08-15T00:00:00.000Z" }]
      : [],
  };
  return { intelligenceRepository, agentRepository, savedTriageRuns };
}

function toolResponse(id: string, name: string, args: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }] } }] }), { status: 200 });
}

test("scans, recalls, scores, and ranks all daily intelligence in a fixed tool order", async () => {
  const { intelligenceRepository, agentRepository, savedTriageRuns } = repositories();
  let request = 0;
  const fetcher = async () => {
    request += 1;
    if (request === 1) return toolResponse("call-1", "list_daily_signals", {});
    if (request === 2) return toolResponse("call-2", "search_memory", { queries: [
      { signalId: "SIG-NEW", query: "Agent 评测工具 产品工作流" },
      { signalId: "SIG-OLD", query: "既有视频工作流" },
    ] });
    if (request === 3) return toolResponse("call-3", "score_candidates", { candidates: [
      { signalId: "SIG-NEW", titleZh: "Agent 评测工具", summaryZh: "用于评测 Agent 工作流质量并定位执行问题。", relevance: 92, novelty: 88, userValue: 90, actionability: 86, evidence: 82, duplicateRisk: 5, pmValueType: "product-idea", rationale: "帮助 PM 建立 Agent 质量评估方案，并转化为可执行的评测能力设计。" },
      { signalId: "SIG-OLD", titleZh: "既有视频工作流更新", summaryZh: "已有视频工作流的小幅功能更新。", relevance: 60, novelty: 30, userValue: 45, actionability: 40, evidence: 60, duplicateRisk: 80, pmValueType: "competitor", rationale: "作为竞品迭代记录，可帮助 PM 判断视频工作流能力差异，但产品增量较低。" },
    ] });
    return toolResponse("call-4", "select_intelligence_for_pool", { summary: "已完成机会评分。" });
  };

  const run = await runOpportunityTriageAgent(
    intelligenceRepository,
    agentRepository,
    { SIGNALFLOW_OPPORTUNITY_AGENT: "true", LLM_API_KEY: "secret", LLM_MODEL: "test-model" },
    fetcher,
  );

  assert.equal(run.status, "completed");
  assert.equal(run.scannedSignals, 2);
  assert.deepEqual(run.toolCalls.map((call) => call.name), ["list_daily_signals", "search_memory", "score_candidates", "select_intelligence_for_pool"]);
  assert.deepEqual(run.recommendedSignalIds, ["SIG-NEW", "SIG-OLD"]);
  assert.match(run.decisionSummary ?? "", /2 条情报/);
  assert.equal(run.candidates[0]?.signalId, "SIG-NEW");
  assert.equal(run.candidates[0]?.summaryZh, "用于评测 Agent 工作流质量并定位执行问题。");
  assert.equal(run.candidates[0]?.pmValueType, "product-idea");
  assert.equal(run.candidates[1]?.memoryMatchCount, 1);
  assert.equal(run.candidates[1]?.recommendation, "candidate");
  assert.equal(savedTriageRuns.length, 1);
  assert.equal(JSON.stringify(run).includes("secret"), false);
});

test("uses original source facts instead of an unreviewed Chinese draft", async () => {
  const contaminated: IntelligenceSignal = {
    ...signals[1],
    id: "SIG-CONTAMINATED",
    title: "Netflix changes its animated film theatrical window",
    summary: "Netflix will release an animated film through Sony in theaters for six weeks before streaming.",
    titleZh: "HEART 叙事框架",
    summaryZh: "用人物关系推进爱情故事。",
    translationStatus: "generated",
  };
  const intelligenceRepository: IntelligenceRepository = {
    getLatestBrief: async (track) => track === "domain" ? brief(track, [contaminated]) : brief(track, []),
    getBrief: async () => null,
    getSeenItems: async () => [],
    saveBrief: async () => undefined,
    findById: async () => contaminated,
  };
  const agentRepository: OpportunityAgentRepository = {
    listRuns: async () => [], saveRun: async () => undefined, listTriageRuns: async () => [], saveTriageRun: async () => undefined, searchMemory: async () => [],
  };
  let request = 0;
  let observation = "";
  const fetcher = async (_input: string | URL | Request, init?: RequestInit) => {
    request += 1;
    if (request === 1) return toolResponse("source-1", "list_daily_signals", {});
    if (request === 2) {
      const body = JSON.parse(String(init?.body)) as { messages: readonly { role: string; content: string }[] };
      observation = body.messages.findLast((message) => message.role === "tool")?.content ?? "";
      return toolResponse("source-2", "search_memory", { queries: [{ signalId: contaminated.id, query: "Netflix animated film" }] });
    }
    if (request === 3) return toolResponse("source-3", "score_candidates", { candidates: [{
      signalId: contaminated.id, titleZh: "Netflix 调整动画电影院线窗口", summaryZh: "Netflix 将通过索尼让动画电影先在院线上映六周，再上线流媒体。", relevance: 50, novelty: 40, userValue: 45, actionability: 35, evidence: 80, duplicateRisk: 0, pmValueType: "industry-context", rationale: "帮助 PM 观察流媒体动画发行策略变化。",
    }] });
    return toolResponse("source-4", "select_intelligence_for_pool", { summary: "完成" });
  };

  const run = await runOpportunityTriageAgent(
    intelligenceRepository,
    agentRepository,
    { SIGNALFLOW_OPPORTUNITY_AGENT: "true", LLM_API_KEY: "secret", LLM_MODEL: "test-model" },
    fetcher,
  );

  assert.equal(run.status, "completed");
  assert.match(observation, /Netflix changes its animated film theatrical window/);
  assert.doesNotMatch(observation, /HEART 叙事框架/);
  assert.equal(run.promptVersion, "daily-triage-v5-source-truth");
});
