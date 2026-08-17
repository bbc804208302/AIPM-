import type { CollectorTrack } from "@/collector/types";
import type { OpportunityPmValueType } from "@/types/agent";

export type AgentEvaluationRootCause =
  | "pipeline"
  | "prompt"
  | "classification-strategy"
  | "scoring-strategy"
  | "decision-threshold";

export interface AgentEvaluationCase {
  id: string;
  track: CollectorTrack;
  briefingDate: string;
  signalId: string;
  expectedPmValueTypes: readonly OpportunityPmValueType[];
  expectedScore: Readonly<{ minimum: number; maximum: number }>;
  expectedDeepAnalysis: boolean;
  requiredFactGroups: readonly (readonly string[])[];
  annotation: string;
}

export interface AgentEvaluationDataset {
  schemaVersion: 1;
  datasetVersion: string;
  description: string;
  cases: readonly AgentEvaluationCase[];
}

export interface AgentEvaluationMetrics {
  evaluatedCases: number;
  taskCompletionRate: number;
  structuredOutputSuccessRate: number;
  summaryFactCoverageRate: number;
  pmValueClassificationAccuracy: number;
  scoreAgreementRate: number;
  deepAnalysisDecisionAgreement: number;
  humanCorrectionRate: number;
  overallQualityScore: number;
}

export interface AgentEvaluationBadcase {
  caseId: string;
  signalId: string;
  title: string;
  rootCause: AgentEvaluationRootCause;
  issue: string;
  expected: string;
  actual: string;
}

export interface AgentEvaluationResult {
  id: string;
  schemaVersion: 1;
  datasetVersion: string;
  agentRunId: string;
  model: string;
  promptVersion: string;
  strategyVersion: string;
  evaluatedAt: string;
  status?: "valid" | "invalid";
  invalidReason?: string;
  metrics: AgentEvaluationMetrics;
  badcases: readonly AgentEvaluationBadcase[];
}

export interface AgentEvaluationResultIndex {
  schemaVersion: 1;
  updatedAt: string | null;
  results: readonly AgentEvaluationResult[];
}
