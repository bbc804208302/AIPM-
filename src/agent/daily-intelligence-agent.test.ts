import assert from "node:assert/strict";
import test from "node:test";

import { selectAutomaticDeepAnalysisSignalIds } from "./daily-intelligence-agent";
import type { OpportunityAgentRun, OpportunityTriageCandidate } from "@/types/agent";

function candidate(id: string, recommendation: OpportunityTriageCandidate["recommendation"]): OpportunityTriageCandidate {
  return {
    signalId: id,
    signalTitle: id,
    titleZh: id,
    summaryZh: `${id} 的中文概述`,
    track: "technical",
    source: "Source",
    heatScore: 80,
    dimensions: { relevance: 80, novelty: 80, userValue: 80, actionability: 80, evidence: 80 },
    duplicateRisk: 0,
    memoryMatchCount: 0,
    opportunityScore: recommendation === "priority" ? 80 : 60,
    recommendation,
    rationale: "测试评分理由",
  };
}

test("auto-analyzes at most three new priority signals", () => {
  const candidates = [candidate("A", "priority"), candidate("B", "priority"), candidate("C", "priority"), candidate("D", "priority"), candidate("E", "candidate")];
  const previousRuns = [{ signalId: "B" }] as OpportunityAgentRun[];
  assert.deepEqual(selectAutomaticDeepAnalysisSignalIds(candidates, previousRuns), ["A", "C", "D"]);
});
