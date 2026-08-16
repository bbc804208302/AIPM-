import "server-only";

import type { CollectorTrack } from "@/collector/types";
import { createFileIntelligenceRepository } from "@/repositories/file/file-intelligence-repository";
import { createFileOpportunityAgentRepository } from "@/repositories/file/file-opportunity-agent-repository";
import type { DailyIntelligenceBrief } from "@/types/intelligence";
import { applyAgentReviewToBrief } from "@/services/project-agent-intelligence";
import { loadCollectorSchedule } from "@/collector/configuration";
import type { DomainFocusArea } from "@/collector/types";

export interface IntelligenceWorkspaceData {
  brief: DailyIntelligenceBrief | null;
  state: "ready" | "empty" | "error";
  focusAreas: readonly DomainFocusArea[];
  agentReviewed: boolean;
  admittedCount: number;
  reviewCount: number;
}

export async function loadIntelligenceWorkspace(track: CollectorTrack, date?: string): Promise<IntelligenceWorkspaceData> {
  try {
    const repository = createFileIntelligenceRepository();
    const agentRepository = createFileOpportunityAgentRepository();
    const [brief, schedule, triageRuns, analysisRuns] = await Promise.all([
      date ? repository.getBrief(track, date) : repository.getLatestBrief(track),
      track === "domain" ? loadCollectorSchedule("domain") : Promise.resolve(null),
      agentRepository.listTriageRuns(),
      agentRepository.listRuns(),
    ]);
    const matchingTriage = brief
      ? triageRuns.find((run) => run.briefingDate === brief.briefingDate) ?? null
      : null;
    const reviewedBrief = brief ? applyAgentReviewToBrief(brief, matchingTriage, analysisRuns) : null;
    const admittedCount = reviewedBrief?.items.filter((item) => item.agentReview?.status !== "review").length ?? 0;
    const reviewCount = reviewedBrief?.items.filter((item) => item.agentReview?.status === "review").length ?? 0;
    return {
      brief: reviewedBrief,
      state: reviewedBrief ? "ready" : "empty",
      focusAreas: schedule?.focusAreas ?? [],
      agentReviewed: matchingTriage !== null,
      admittedCount,
      reviewCount,
    };
  } catch {
    return { brief: null, state: "error", focusAreas: [], agentReviewed: false, admittedCount: 0, reviewCount: 0 };
  }
}
