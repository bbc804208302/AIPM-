import type { CollectorTrack } from "@/collector/types";
import type { DemandPriority } from "@/types/demands";

export type OpportunityAgentToolName =
  | "get_signal"
  | "search_memory"
  | "create_demand_proposal"
  | "reject_signal"
  | "list_daily_signals"
  | "score_candidates"
  | "recommend_top_signals"
  | "select_intelligence_for_pool";

export type OpportunityAgentRunStatus = "completed" | "rejected" | "failed";

export interface OpportunityAgentToolCall {
  id: string;
  name: OpportunityAgentToolName;
  status: "success" | "failed";
  inputSummary: string;
  outputSummary: string;
  durationMs: number;
}

export interface DemandProposal {
  id: string;
  title: string;
  problem: string;
  targetUser: string;
  opportunity: string;
  suggestedSolution: string;
  rationale: string;
  priority: DemandPriority;
  sourceSignalId: string;
  approvalStatus: "pending-human-review";
}

export interface OpportunityAgentMemoryMatch {
  runId: string;
  signalTitle: string;
  decision: "proposal" | "reject";
  summary: string;
  createdAt: string;
}

export interface OpportunityAgentRun {
  id: string;
  agent: "product-opportunity-agent";
  version: 1;
  signalId: string;
  signalTitle: string;
  track: CollectorTrack;
  objective: string;
  status: OpportunityAgentRunStatus;
  decision: "proposal" | "reject" | "failed";
  decisionSummary: string;
  model: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  toolCalls: readonly OpportunityAgentToolCall[];
  memoryMatches: readonly OpportunityAgentMemoryMatch[];
  proposal: DemandProposal | null;
  error: string | null;
}

export interface OpportunityTriageDimensionScores {
  relevance: number;
  novelty: number;
  userValue: number;
  actionability: number;
  evidence: number;
}

export type OpportunityTriageRecommendation = "priority" | "candidate" | "skip";

export type OpportunityPmValueType =
  | "product-idea"
  | "design-pattern"
  | "competitor"
  | "capability"
  | "business-opportunity"
  | "industry-context";

export interface OpportunityTriageCandidate {
  signalId: string;
  signalTitle: string;
  titleZh: string;
  summaryZh: string;
  track: CollectorTrack;
  source: string;
  heatScore: number | null;
  dimensions: OpportunityTriageDimensionScores;
  duplicateRisk: number;
  memoryMatchCount: number;
  opportunityScore: number;
  recommendation: OpportunityTriageRecommendation;
  pmValueType?: OpportunityPmValueType;
  rationale: string;
}

export interface OpportunityTriageRun {
  id: string;
  agent: "product-opportunity-agent";
  mode: "daily-triage";
  version: 2 | 3 | 4;
  briefingDate: string;
  objective: string;
  status: "completed" | "failed";
  model: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  scannedSignals: number;
  candidates: readonly OpportunityTriageCandidate[];
  /** Version 4 treats this as every scored signal, ordered by opportunity score. */
  recommendedSignalIds: readonly string[];
  reviewSignalIds?: readonly string[];
  autoAnalyzedSignalIds?: readonly string[];
  decisionSummary: string;
  toolCalls: readonly OpportunityAgentToolCall[];
  error: string | null;
}

export interface OpportunityAgentRunIndex {
  schemaVersion: 1 | 2;
  updatedAt: string | null;
  runs: readonly OpportunityAgentRun[];
  triageRuns?: readonly OpportunityTriageRun[];
}
