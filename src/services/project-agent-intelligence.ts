import type { OpportunityAgentRun, OpportunityTriageRun } from "@/types/agent";
import type { DailyIntelligenceBrief } from "@/types/intelligence";
import type { IntelligenceSignal } from "@/types/intelligence";

export function sortIntelligenceByOpportunity(items: readonly IntelligenceSignal[]): readonly IntelligenceSignal[] {
  return [...items].sort((left, right) => {
    const scoreDifference = (right.agentReview?.opportunityScore ?? -1) - (left.agentReview?.opportunityScore ?? -1);
    if (scoreDifference !== 0) return scoreDifference;
    return (right.publishedAt ?? right.createdAt).localeCompare(left.publishedAt ?? left.createdAt);
  });
}

export function applyAgentReviewToBrief(
  brief: DailyIntelligenceBrief,
  triageRun: OpportunityTriageRun | null,
  analysisRuns: readonly OpportunityAgentRun[],
): DailyIntelligenceBrief {
  if (!triageRun || triageRun.briefingDate !== brief.briefingDate || triageRun.status !== "completed") {
    return {
      ...brief,
      items: brief.items.map((item) => ({
        ...item,
        agentReview: {
          status: "unreviewed",
          opportunityScore: null,
          recommendation: null,
          rationale: null,
          duplicateRisk: null,
          reviewedAt: null,
          deepAnalysis: "not-run",
          deepAnalysisSummary: null,
        },
      })),
    };
  }

  const candidates = new Map(triageRun.candidates.map((candidate) => [candidate.signalId, candidate]));
  const latestAnalysisBySignal = new Map<string, OpportunityAgentRun>();
  for (const run of analysisRuns) {
    if (!latestAnalysisBySignal.has(run.signalId)) latestAnalysisBySignal.set(run.signalId, run);
  }
  return {
    ...brief,
    items: brief.items.map((item) => {
      const candidate = candidates.get(item.id);
      const analysis = latestAnalysisBySignal.get(item.id);
      if (!candidate) return {
        ...item,
        agentReview: {
          status: "unreviewed" as const,
          opportunityScore: null,
          recommendation: null,
          rationale: null,
          duplicateRisk: null,
          reviewedAt: triageRun.completedAt,
          deepAnalysis: "not-run" as const,
          deepAnalysisSummary: null,
        },
      };
      return {
        ...item,
        titleZh: candidate.titleZh || item.titleZh,
        summaryZh: candidate.summaryZh || item.summaryZh,
        translationStatus: candidate.summaryZh ? "llm-reviewed" as const : item.translationStatus,
        agentReview: {
          status: candidate.recommendation === "skip" ? "review" as const : "admitted" as const,
          opportunityScore: candidate.opportunityScore,
          recommendation: candidate.recommendation,
          rationale: candidate.rationale,
          duplicateRisk: candidate.duplicateRisk,
          reviewedAt: triageRun.completedAt,
          deepAnalysis: analysis?.decision === "proposal" ? "proposal" as const : analysis?.decision === "reject" ? "rejected" as const : "not-run" as const,
          deepAnalysisSummary: analysis?.decisionSummary ?? null,
        },
      };
    }),
  };
}
