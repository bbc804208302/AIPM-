import assert from "node:assert/strict";
import test from "node:test";

import { applyAgentReviewToBrief, sortIntelligenceByOpportunity } from "./project-agent-intelligence";
import type { OpportunityAgentRun, OpportunityTriageCandidate, OpportunityTriageRun } from "@/types/agent";
import type { DailyIntelligenceBrief, IntelligenceSignal } from "@/types/intelligence";

function signal(id: string): IntelligenceSignal {
  return {
    id,
    briefingDate: "2026-08-16",
    track: "technical",
    title: `${id} original title`,
    sourceId: "source",
    source: "Source",
    sourceGroup: "ai-media",
    sourceType: "rss",
    trustTier: "curated",
    category: "product",
    summary: `${id} source summary`,
    url: `https://example.com/${id}`,
    publishedAt: "2026-08-16T00:00:00.000Z",
    collectedAt: "2026-08-16T01:00:00.000Z",
    sourceRank: null,
    sourceMetadata: {},
    selectionReason: "Recent",
    impactScore: null,
    noveltyScore: null,
    productInsight: null,
    createdAt: "2026-08-16T01:00:00.000Z",
    highValue: false,
    readStatus: "未读",
    convertedToDemand: false,
  };
}

function candidate(id: string, recommendation: OpportunityTriageCandidate["recommendation"]): OpportunityTriageCandidate {
  return {
    signalId: id,
    signalTitle: `${id} 中文标题`,
    titleZh: `${id} 中文标题`,
    summaryZh: `${id} 是一个经过 Agent 概括的产品情报。`,
    track: "technical",
    source: "Source",
    heatScore: 70,
    dimensions: { relevance: 80, novelty: 70, userValue: 75, actionability: 70, evidence: 70 },
    duplicateRisk: 10,
    memoryMatchCount: 0,
    opportunityScore: recommendation === "skip" ? 45 : 72,
    recommendation,
    pmValueType: recommendation === "priority" ? "product-idea" : "competitor",
    rationale: `${id} 对产品经理的判断价值`,
  };
}

const brief: DailyIntelligenceBrief = {
  schemaVersion: 1,
  briefingDate: "2026-08-16",
  timezone: "Asia/Shanghai",
  track: "technical",
  generatedAt: "2026-08-16T01:00:00.000Z",
  candidateCount: 3,
  dailyLimit: 20,
  items: [signal("A"), signal("B"), signal("C")],
  sources: [],
};

const triageRun = {
  id: "TRIAGE-1",
  agent: "product-opportunity-agent",
  mode: "daily-triage",
  version: 3,
  briefingDate: "2026-08-16",
  objective: "PM opportunity scoring",
  status: "completed",
  model: "test-model",
  startedAt: "2026-08-16T01:00:00.000Z",
  completedAt: "2026-08-16T01:01:00.000Z",
  durationMs: 60_000,
  scannedSignals: 3,
  candidates: [candidate("A", "priority"), candidate("B", "skip")],
  recommendedSignalIds: ["A"],
  reviewSignalIds: ["B"],
  autoAnalyzedSignalIds: ["A"],
  decisionSummary: "Admitted A",
  toolCalls: [],
  error: null,
} satisfies OpportunityTriageRun;

test("projects Agent scoring, PM value, Chinese overview, and deep analysis onto intelligence", () => {
  const analysisRuns = [{ signalId: "A", decision: "proposal", decisionSummary: "发现明确的 Agent 评测需求。" }] as OpportunityAgentRun[];
  const reviewed = applyAgentReviewToBrief(brief, triageRun, analysisRuns);

  assert.equal(reviewed.items[0]?.titleZh, "A 中文标题");
  assert.equal(reviewed.items[0]?.summaryZh, "A 是一个经过 Agent 概括的产品情报。");
  assert.equal(reviewed.items[0]?.agentReview?.status, "admitted");
  assert.equal(reviewed.items[0]?.agentReview?.deepAnalysis, "proposal");
  assert.equal(reviewed.items[0]?.agentReview?.pmValueType, "product-idea");
  assert.equal(reviewed.items[1]?.agentReview?.status, "admitted");
  assert.equal(reviewed.items[2]?.agentReview?.status, "unreviewed");
});

test("sorts reviewed intelligence from highest to lowest opportunity score", () => {
  const reviewed = applyAgentReviewToBrief(brief, triageRun, []);
  const sorted = sortIntelligenceByOpportunity(reviewed.items);

  assert.deepEqual(sorted.map((item) => item.id), ["A", "B", "C"]);
});
