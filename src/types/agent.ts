import type { CollectorTrack } from "@/collector/types";
import type { DemandPriority } from "@/types/demands";

export type OpportunityAgentToolName =
  | "get_signal"
  | "search_memory"
  | "create_demand_proposal"
  | "reject_signal";

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

export interface OpportunityAgentRunIndex {
  schemaVersion: 1;
  updatedAt: string | null;
  runs: readonly OpportunityAgentRun[];
}
