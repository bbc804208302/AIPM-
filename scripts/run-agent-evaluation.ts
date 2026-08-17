import fs from "node:fs/promises";
import path from "node:path";

import { evaluateOpportunityTriageRun, getBundledAgentEvaluationDataset } from "../src/agent/evaluation";
import { runOpportunityTriageAgent } from "../src/agent/opportunity-triage-agent";
import type { IntelligenceRepository } from "../src/repositories/intelligence-repository";
import type { OpportunityAgentRepository } from "../src/repositories/opportunity-agent-repository";
import { createFileAgentEvaluationRepository } from "../src/repositories/file/file-agent-evaluation-repository";
import type { CollectorTrack } from "../src/collector/types";
import type { DailyIntelligenceBrief, IntelligenceSignal } from "../src/types/intelligence";
import { loadLocalEnvironment } from "./load-env";

async function loadEvaluationBriefs(): Promise<ReadonlyMap<CollectorTrack, DailyIntelligenceBrief>> {
  const dataset = getBundledAgentEvaluationDataset();
  const briefs = new Map<CollectorTrack, DailyIntelligenceBrief>();

  for (const track of ["technical", "domain"] as const) {
    const cases = dataset.cases.filter((evaluationCase) => evaluationCase.track === track);
    if (cases.length === 0) continue;
    const sourceBriefs = new Map<string, DailyIntelligenceBrief>();
    for (const evaluationCase of cases) {
      const filePath = path.join(process.cwd(), "data", "intelligence", track, `${evaluationCase.briefingDate}.json`);
      sourceBriefs.set(evaluationCase.briefingDate, JSON.parse(await fs.readFile(filePath, "utf8")) as DailyIntelligenceBrief);
    }
    const items = cases.map((evaluationCase) => {
      const item = sourceBriefs.get(evaluationCase.briefingDate)?.items.find((candidate) => candidate.id === evaluationCase.signalId);
      if (!item) throw new Error(`评测样本 ${evaluationCase.id} 找不到历史情报 ${evaluationCase.signalId}。`);
      return item;
    });
    const latestSource = sourceBriefs.get(cases[0].briefingDate) as DailyIntelligenceBrief;
    briefs.set(track, {
      ...latestSource,
      candidateCount: items.length,
      dailyLimit: items.length,
      items,
      generatedAt: new Date().toISOString(),
    });
  }
  return briefs;
}

function createEvaluationIntelligenceRepository(briefs: ReadonlyMap<CollectorTrack, DailyIntelligenceBrief>): IntelligenceRepository {
  const items = [...briefs.values()].flatMap((brief) => brief.items);
  return {
    async getLatestBrief(track) { return briefs.get(track) ?? null; },
    async getBrief(track, briefingDate) {
      const brief = briefs.get(track);
      return brief?.briefingDate === briefingDate ? brief : null;
    },
    async getSeenItems() { return []; },
    async saveBrief() { throw new Error("Agent Eval 不允许修改情报快照。"); },
    async findById(id) { return items.find((item: IntelligenceSignal) => item.id === id) ?? null; },
  };
}

function createEvaluationAgentRepository(): OpportunityAgentRepository {
  return {
    async listRuns() { return []; },
    async saveRun() {},
    async listTriageRuns() { return []; },
    async saveTriageRun() {},
    async searchMemory() { return []; },
  };
}

async function main(): Promise<void> {
  loadLocalEnvironment();
  const dataset = getBundledAgentEvaluationDataset();
  const briefs = await loadEvaluationBriefs();
  const run = await runOpportunityTriageAgent(
    createEvaluationIntelligenceRepository(briefs),
    createEvaluationAgentRepository(),
  );
  if (run.status !== "completed") throw new Error(run.error ?? "Agent Eval 运行失败。");
  const result = evaluateOpportunityTriageRun(run, dataset);
  await createFileAgentEvaluationRepository().saveResult(result);

  console.log("SignalFlow Product Intelligence Agent · Fixed Evaluation");
  console.log(`Dataset: ${result.datasetVersion} · ${result.metrics.evaluatedCases} cases`);
  console.log(`Overall quality: ${result.metrics.overallQualityScore}%`);
  console.log(`Task completion: ${result.metrics.taskCompletionRate}%`);
  console.log(`Fact coverage: ${result.metrics.summaryFactCoverageRate}%`);
  console.log(`PM classification: ${result.metrics.pmValueClassificationAccuracy}%`);
  console.log(`Score agreement: ${result.metrics.scoreAgreementRate}%`);
  console.log(`Deep-analysis agreement: ${result.metrics.deepAnalysisDecisionAgreement}%`);
  console.log(`Badcases: ${result.badcases.length}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Agent Eval failed.");
  process.exitCode = 1;
});
