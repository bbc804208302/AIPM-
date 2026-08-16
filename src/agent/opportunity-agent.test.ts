import assert from "node:assert/strict";
import test from "node:test";

import { readOpportunityAgentConfig, runOpportunityAgent } from "./opportunity-agent";
import type { IntelligenceRepository } from "@/repositories/intelligence-repository";
import type { OpportunityAgentRepository } from "@/repositories/opportunity-agent-repository";
import type { OpportunityAgentRun } from "@/types/agent";
import type { IntelligenceSignal } from "@/types/intelligence";

const signal: IntelligenceSignal = {
  id: "SIG-AGENT", briefingDate: "2026-08-16", track: "technical", title: "Agent tool release", titleZh: "Agent 工具发布", sourceId: "source", source: "AI Source", sourceGroup: "ai-media", sourceType: "rss", trustTier: "curated", category: "agent", summary: "An agent tool helps product teams inspect workflows.", summaryZh: "该工具帮助产品团队检查 Agent 工作流。", translationStatus: "llm-reviewed", url: "https://example.com/agent", publishedAt: "2026-08-16T00:00:00.000Z", collectedAt: "2026-08-16T01:00:00.000Z", sourceRank: null, sourceMetadata: {}, selectionReason: "Recent", impactScore: null, noveltyScore: null, productInsight: null, createdAt: "2026-08-16T01:00:00.000Z", highValue: false, readStatus: "未读", convertedToDemand: false,
};

function repositories() {
  const savedRuns: OpportunityAgentRun[] = [];
  const intelligenceRepository: IntelligenceRepository = {
    getLatestBrief: async () => null,
    getBrief: async () => null,
    getSeenItems: async () => [],
    saveBrief: async () => undefined,
    findById: async (id) => id === signal.id ? signal : null,
  };
  const agentRepository: OpportunityAgentRepository = {
    listRuns: async () => savedRuns,
    saveRun: async (run) => { savedRuns.push(run); },
    searchMemory: async () => [{ runId: "RUN-OLD", signalTitle: "旧 Agent 信号", decision: "proposal", summary: "曾评估过工作流可观测性需求", createdAt: "2026-08-15T00:00:00.000Z" }],
  };
  return { intelligenceRepository, agentRepository, savedRuns };
}

function toolResponse(id: string, name: string, args: Record<string, string>): Response {
  return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }] } }] }), { status: 200 });
}

test("requires an explicit Agent flag and LLM key", () => {
  assert.equal(readOpportunityAgentConfig({ LLM_API_KEY: "key" }), null);
  assert.equal(readOpportunityAgentConfig({ SIGNALFLOW_OPPORTUNITY_AGENT: "true" }), null);
  assert.equal(readOpportunityAgentConfig({ SIGNALFLOW_OPPORTUNITY_AGENT: "true", LLM_API_KEY: "key", LLM_MODEL: "deepseek-chat" })?.model, "deepseek-chat");
});

test("uses signal, memory, and proposal tools before saving an auditable run", async () => {
  const { intelligenceRepository, agentRepository, savedRuns } = repositories();
  let request = 0;
  const fetcher = async () => {
    request += 1;
    if (request === 1) return toolResponse("call-1", "get_signal", { signalId: signal.id });
    if (request === 2) return toolResponse("call-2", "search_memory", { query: "Agent 工作流 产品团队" });
    return toolResponse("call-3", "create_demand_proposal", {
      title: "Agent 工作流质量诊断",
      problem: "产品经理难以快速定位 Agent 工作流失败环节。",
      targetUser: "负责 Agent 产品的产品经理",
      opportunity: "把工具调用轨迹转化为可读的质量诊断。",
      suggestedSolution: "提供步骤、工具、失败原因和待确认建议。",
      rationale: "当前公开信号证明工作流检查工具正在形成产品需求。",
      priority: "high",
    });
  };

  const run = await runOpportunityAgent(
    signal.id,
    intelligenceRepository,
    agentRepository,
    { SIGNALFLOW_OPPORTUNITY_AGENT: "true", LLM_API_KEY: "secret", LLM_MODEL: "test-model" },
    fetcher,
  );

  assert.equal(run.status, "completed");
  assert.equal(run.proposal?.approvalStatus, "pending-human-review");
  assert.deepEqual(run.toolCalls.map((call) => call.name), ["get_signal", "search_memory", "create_demand_proposal"]);
  assert.equal(run.memoryMatches.length, 1);
  assert.equal(savedRuns.length, 1);
  assert.equal(JSON.stringify(run).includes("secret"), false);
});

test("records a failed run when the model skips required tools", async () => {
  const { intelligenceRepository, agentRepository } = repositories();
  const fetcher = async () => toolResponse("call-1", "create_demand_proposal", {
    title: "不完整候选", problem: "问题", targetUser: "用户", opportunity: "机会", suggestedSolution: "方案", rationale: "理由", priority: "medium",
  });

  const run = await runOpportunityAgent(
    signal.id,
    intelligenceRepository,
    agentRepository,
    { SIGNALFLOW_OPPORTUNITY_AGENT: "true", LLM_API_KEY: "secret" },
    fetcher,
  );

  assert.equal(run.status, "failed");
  assert.equal(run.toolCalls.length, 6);
  assert.match(run.error ?? "", /最大步骤数/);
});
