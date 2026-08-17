import assert from "node:assert/strict";
import test from "node:test";

import { evaluateOpportunityTriageRun } from "./evaluation";
import type { AgentEvaluationDataset } from "@/types/agent-evaluation";
import type { OpportunityTriageCandidate, OpportunityTriageRun } from "@/types/agent";

const candidate: OpportunityTriageCandidate = {
  signalId: "SIG-1",
  signalTitle: "Meantio 手机短剧创作工具",
  titleZh: "Meantio 手机短剧创作工具",
  summaryZh: "Meantio 让用户通过智能手机完成短剧创作，降低普通创作者的制作门槛。",
  track: "domain",
  source: "Test Source",
  heatScore: 70,
  dimensions: { relevance: 90, novelty: 80, userValue: 88, actionability: 85, evidence: 75 },
  duplicateRisk: 0,
  memoryMatchCount: 0,
  opportunityScore: 80,
  recommendation: "priority",
  pmValueType: "product-idea",
  rationale: "提供低门槛内容创作产品思路。",
};

const run: OpportunityTriageRun = {
  id: "TRIAGE-EVAL",
  agent: "product-opportunity-agent",
  mode: "daily-triage",
  version: 4,
  promptVersion: "daily-triage-v4",
  strategyVersion: "opportunity-weighted-v1",
  briefingDate: "2026-08-16",
  objective: "评测",
  status: "completed",
  model: "test-model",
  startedAt: "2026-08-17T00:00:00.000Z",
  completedAt: "2026-08-17T00:00:01.000Z",
  durationMs: 1000,
  scannedSignals: 1,
  candidates: [candidate],
  recommendedSignalIds: [candidate.signalId],
  decisionSummary: "完成",
  toolCalls: [],
  error: null,
};

const dataset: AgentEvaluationDataset = {
  schemaVersion: 1,
  datasetVersion: "test-v1",
  description: "test",
  cases: [{
    id: "CASE-1",
    track: "domain",
    briefingDate: "2026-08-16",
    signalId: "SIG-1",
    expectedPmValueTypes: ["product-idea"],
    expectedScore: { minimum: 70, maximum: 90 },
    expectedDeepAnalysis: true,
    requiredFactGroups: [["Meantio"], ["手机"], ["短剧"], ["创作"]],
    annotation: "test",
  }],
};

test("evaluates a triage run against fixed human labels", () => {
  const result = evaluateOpportunityTriageRun(run, dataset, "2026-08-17T01:00:00.000Z");

  assert.equal(result.metrics.taskCompletionRate, 100);
  assert.equal(result.metrics.structuredOutputSuccessRate, 100);
  assert.equal(result.metrics.summaryFactCoverageRate, 100);
  assert.equal(result.metrics.pmValueClassificationAccuracy, 100);
  assert.equal(result.metrics.scoreAgreementRate, 100);
  assert.equal(result.metrics.deepAnalysisDecisionAgreement, 100);
  assert.equal(result.metrics.humanCorrectionRate, 0);
  assert.equal(result.metrics.overallQualityScore, 100);
  assert.equal(result.badcases.length, 0);
});

test("classifies missing facts and wrong decisions as actionable badcases", () => {
  const weakCandidate: OpportunityTriageCandidate = {
    ...candidate,
    summaryZh: "这是一款新的内容产品。",
    pmValueType: "industry-context",
    opportunityScore: 50,
    recommendation: "candidate",
  };
  const result = evaluateOpportunityTriageRun({ ...run, candidates: [weakCandidate] }, dataset);

  assert.equal(result.metrics.summaryFactCoverageRate, 0);
  assert.equal(result.metrics.pmValueClassificationAccuracy, 0);
  assert.equal(result.metrics.scoreAgreementRate, 0);
  assert.equal(result.metrics.deepAnalysisDecisionAgreement, 0);
  assert.equal(result.metrics.humanCorrectionRate, 100);
  assert.deepEqual(new Set(result.badcases.map((item) => item.rootCause)), new Set([
    "prompt", "classification-strategy", "scoring-strategy", "decision-threshold",
  ]));
});
