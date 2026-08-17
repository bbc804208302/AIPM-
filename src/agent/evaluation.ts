import bundledDataset from "../../data/agent/evaluation/cases.json";

import type {
  AgentEvaluationBadcase,
  AgentEvaluationCase,
  AgentEvaluationDataset,
  AgentEvaluationMetrics,
  AgentEvaluationResult,
} from "@/types/agent-evaluation";
import type { OpportunityTriageCandidate, OpportunityTriageRun } from "@/types/agent";

const automaticDeepAnalysisThreshold = 70;

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function containsChinese(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value);
}

function hasStructuredOutput(candidate: OpportunityTriageCandidate): boolean {
  const scores = Object.values(candidate.dimensions);
  return candidate.summaryZh.trim().length > 0
    && containsChinese(candidate.summaryZh)
    && scores.length === 5
    && scores.every((value) => Number.isFinite(value) && value >= 0 && value <= 100)
    && Number.isFinite(candidate.opportunityScore)
    && candidate.opportunityScore >= 0
    && candidate.opportunityScore <= 100;
}

function factCoverage(candidate: OpportunityTriageCandidate, evaluationCase: AgentEvaluationCase): Readonly<{ matched: number; total: number; missing: readonly string[] }> {
  const searchable = candidate.summaryZh.toLocaleLowerCase();
  const missing = evaluationCase.requiredFactGroups
    .filter((group) => !group.some((term) => searchable.includes(term.toLocaleLowerCase())))
    .map((group) => group.join(" / "));
  return {
    matched: evaluationCase.requiredFactGroups.length - missing.length,
    total: evaluationCase.requiredFactGroups.length,
    missing,
  };
}

function addBadcase(
  target: AgentEvaluationBadcase[],
  evaluationCase: AgentEvaluationCase,
  candidate: OpportunityTriageCandidate | undefined,
  details: Omit<AgentEvaluationBadcase, "caseId" | "signalId" | "title">,
): void {
  target.push({
    caseId: evaluationCase.id,
    signalId: evaluationCase.signalId,
    title: candidate?.titleZh ?? evaluationCase.signalId,
    ...details,
  });
}

export function getBundledAgentEvaluationDataset(): AgentEvaluationDataset {
  const dataset = bundledDataset as AgentEvaluationDataset;
  const ids = new Set<string>();
  for (const evaluationCase of dataset.cases) {
    if (ids.has(evaluationCase.id)) throw new Error(`Agent Eval 样本 ID 重复：${evaluationCase.id}`);
    ids.add(evaluationCase.id);
    if (evaluationCase.expectedScore.minimum < 0
      || evaluationCase.expectedScore.maximum > 100
      || evaluationCase.expectedScore.minimum > evaluationCase.expectedScore.maximum) {
      throw new Error(`Agent Eval 样本评分区间无效：${evaluationCase.id}`);
    }
    const thresholdConsistent = evaluationCase.expectedDeepAnalysis
      ? evaluationCase.expectedScore.minimum >= automaticDeepAnalysisThreshold
      : evaluationCase.expectedScore.maximum < automaticDeepAnalysisThreshold;
    if (!thresholdConsistent) throw new Error(`Agent Eval 深度分析标注与评分区间冲突：${evaluationCase.id}`);
    if (evaluationCase.requiredFactGroups.length === 0) throw new Error(`Agent Eval 样本缺少事实标注：${evaluationCase.id}`);
  }
  return dataset;
}

export function evaluateOpportunityTriageRun(
  run: OpportunityTriageRun,
  dataset: AgentEvaluationDataset = getBundledAgentEvaluationDataset(),
  evaluatedAt = new Date().toISOString(),
): AgentEvaluationResult {
  const candidates = new Map(run.candidates.map((candidate) => [candidate.signalId, candidate]));
  const badcases: AgentEvaluationBadcase[] = [];
  let completed = 0;
  let structured = 0;
  let matchedFacts = 0;
  let totalFacts = 0;
  let classified = 0;
  let scoreAgreements = 0;
  let deepAnalysisAgreements = 0;
  const casesNeedingCorrection = new Set<string>();

  for (const evaluationCase of dataset.cases) {
    const candidate = candidates.get(evaluationCase.signalId);
    totalFacts += evaluationCase.requiredFactGroups.length;
    if (!candidate) {
      casesNeedingCorrection.add(evaluationCase.id);
      addBadcase(badcases, evaluationCase, candidate, {
        rootCause: "pipeline",
        issue: "Agent 未返回该固定评测样本",
        expected: "完成结构化评分",
        actual: "缺失",
      });
      continue;
    }

    completed += 1;
    if (hasStructuredOutput(candidate)) structured += 1;
    else {
      casesNeedingCorrection.add(evaluationCase.id);
      addBadcase(badcases, evaluationCase, candidate, {
        rootCause: "pipeline",
        issue: "结构化输出不完整",
        expected: "中文概述、五维评分和机会分完整",
        actual: "存在缺失或越界字段",
      });
    }

    const coverage = factCoverage(candidate, evaluationCase);
    matchedFacts += coverage.matched;
    if (coverage.missing.length > 0) {
      casesNeedingCorrection.add(evaluationCase.id);
      addBadcase(badcases, evaluationCase, candidate, {
        rootCause: "prompt",
        issue: "中文概述遗漏关键事实",
        expected: coverage.missing.join("；"),
        actual: candidate.summaryZh,
      });
    }

    if (candidate.pmValueType && evaluationCase.expectedPmValueTypes.includes(candidate.pmValueType)) classified += 1;
    else {
      casesNeedingCorrection.add(evaluationCase.id);
      addBadcase(badcases, evaluationCase, candidate, {
        rootCause: "classification-strategy",
        issue: "PM 价值分类与人工标注不一致",
        expected: evaluationCase.expectedPmValueTypes.join(" / "),
        actual: candidate.pmValueType ?? "未分类",
      });
    }

    const scoreInRange = candidate.opportunityScore >= evaluationCase.expectedScore.minimum
      && candidate.opportunityScore <= evaluationCase.expectedScore.maximum;
    if (scoreInRange) scoreAgreements += 1;
    else {
      casesNeedingCorrection.add(evaluationCase.id);
      addBadcase(badcases, evaluationCase, candidate, {
        rootCause: "scoring-strategy",
        issue: "机会分超出人工标注区间",
        expected: `${evaluationCase.expectedScore.minimum}–${evaluationCase.expectedScore.maximum}`,
        actual: String(candidate.opportunityScore),
      });
    }

    const actualDeepAnalysis = candidate.opportunityScore >= automaticDeepAnalysisThreshold;
    if (actualDeepAnalysis === evaluationCase.expectedDeepAnalysis) deepAnalysisAgreements += 1;
    else {
      casesNeedingCorrection.add(evaluationCase.id);
      addBadcase(badcases, evaluationCase, candidate, {
        rootCause: "decision-threshold",
        issue: "深度分析决策与人工标注不一致",
        expected: evaluationCase.expectedDeepAnalysis ? "应自动深度分析" : "不应自动深度分析",
        actual: actualDeepAnalysis ? "进入自动深度分析" : "未进入自动深度分析",
      });
    }
  }

  const total = dataset.cases.length;
  const metricsWithoutOverall = {
    evaluatedCases: total,
    taskCompletionRate: percentage(completed, total),
    structuredOutputSuccessRate: percentage(structured, total),
    summaryFactCoverageRate: percentage(matchedFacts, totalFacts),
    pmValueClassificationAccuracy: percentage(classified, total),
    scoreAgreementRate: percentage(scoreAgreements, total),
    deepAnalysisDecisionAgreement: percentage(deepAnalysisAgreements, total),
    humanCorrectionRate: percentage(casesNeedingCorrection.size, total),
  };
  const overallQualityScore = Math.round(
    metricsWithoutOverall.taskCompletionRate * 0.15
    + metricsWithoutOverall.structuredOutputSuccessRate * 0.15
    + metricsWithoutOverall.summaryFactCoverageRate * 0.25
    + metricsWithoutOverall.pmValueClassificationAccuracy * 0.15
    + metricsWithoutOverall.scoreAgreementRate * 0.15
    + metricsWithoutOverall.deepAnalysisDecisionAgreement * 0.15,
  );
  const metrics: AgentEvaluationMetrics = { ...metricsWithoutOverall, overallQualityScore };

  return {
    id: `AGENT-EVAL-${run.id}`,
    schemaVersion: 1,
    datasetVersion: dataset.datasetVersion,
    agentRunId: run.id,
    model: run.model,
    promptVersion: run.promptVersion ?? `daily-triage-v${run.version}`,
    strategyVersion: run.strategyVersion ?? "opportunity-weighted-v1",
    evaluatedAt,
    status: "valid",
    metrics,
    badcases,
  };
}
