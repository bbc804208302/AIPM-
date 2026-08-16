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

test("scans, recalls, scores, and recommends daily signals in a fixed tool order", async () => {
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
      { signalId: "SIG-NEW", relevance: 92, novelty: 88, userValue: 90, actionability: 86, evidence: 82, duplicateRisk: 5, rationale: "提供可落地的 Agent 质量评测能力。" },
      { signalId: "SIG-OLD", relevance: 60, novelty: 30, userValue: 45, actionability: 40, evidence: 60, duplicateRisk: 80, rationale: "信息增量有限且历史已覆盖。" },
    ] });
    return toolResponse("call-4", "recommend_top_signals", { summary: "优先分析 Agent 评测工具，既有视频工作流暂不重复分析。" });
  };

  const run = await runOpportunityTriageAgent(
    intelligenceRepository,
    agentRepository,
    { SIGNALFLOW_OPPORTUNITY_AGENT: "true", LLM_API_KEY: "secret", LLM_MODEL: "test-model" },
    fetcher,
  );

  assert.equal(run.status, "completed");
  assert.equal(run.scannedSignals, 2);
  assert.deepEqual(run.toolCalls.map((call) => call.name), ["list_daily_signals", "search_memory", "score_candidates", "recommend_top_signals"]);
  assert.deepEqual(run.recommendedSignalIds, ["SIG-NEW"]);
  assert.match(run.decisionSummary ?? "", /Agent 评测工具/);
  assert.doesNotMatch(run.decisionSummary ?? "", /既有视频工作流暂不重复分析/);
  assert.equal(run.candidates[0]?.signalId, "SIG-NEW");
  assert.equal(run.candidates[1]?.memoryMatchCount, 1);
  assert.equal(savedTriageRuns.length, 1);
  assert.equal(JSON.stringify(run).includes("secret"), false);
});
