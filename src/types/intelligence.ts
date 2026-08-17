import type { CollectorCategory, CollectorSourceType, CollectorTrack, SourceTrustTier } from "@/collector/types";
import type { OpportunityPmValueType } from "@/types/agent";

export type IntelligenceCategory =
  | "model-capability"
  | "agent"
  | "ai-coding"
  | "multimodal"
  | "product"
  | "interaction"
  | "business-model"
  | "other";

export interface IntelligenceSignal {
  id: string;
  briefingDate: string;
  track: CollectorTrack;
  title: string;
  titleZh?: string;
  sourceId: string;
  source: string;
  sourceGroup: CollectorCategory;
  sourceType: CollectorSourceType;
  trustTier: SourceTrustTier;
  category: IntelligenceCategory;
  summary: string;
  summaryZh?: string;
  translationStatus?: "reviewed" | "generated" | "needs-review" | "llm-reviewed";
  url: string;
  publishedAt: string | null;
  collectedAt: string;
  sourceRank: number | null;
  sourceMetadata: Readonly<Record<string, string | number | boolean>>;
  selectionReason: string;
  heatScore?: number | null;
  impactScore: number | null;
  noveltyScore: number | null;
  productInsight: string | null;
  createdAt: string;
  highValue: boolean;
  readStatus: string | null;
  convertedToDemand: boolean;
  agentReview?: IntelligenceAgentReview;
}

export interface IntelligenceAgentReview {
  status: "admitted" | "review" | "unreviewed";
  opportunityScore: number | null;
  recommendation: "priority" | "candidate" | "skip" | null;
  pmValueType: OpportunityPmValueType | null;
  rationale: string | null;
  duplicateRisk: number | null;
  reviewedAt: string | null;
  deepAnalysis: "proposal" | "rejected" | "not-run";
  deepAnalysisSummary: string | null;
}

export interface IntelligenceSourceReport {
  sourceId: string;
  sourceName: string;
  status: "success" | "failed";
  collected: number;
  durationMs: number;
  error?: string;
}

export type LlmReviewRunStatus = "disabled" | "not-configured" | "completed" | "partial" | "failed";

export type LlmReviewIssueCode =
  | "provider-http-error"
  | "missing-content"
  | "invalid-json"
  | "incomplete-items"
  | "request-error";

export interface LlmReviewIssue {
  batchIndex: number;
  itemIds: readonly string[];
  code: LlmReviewIssueCode;
  attempts: number;
  httpStatus?: number;
  finishReason?: string;
  contentLength?: number;
}

export interface LlmReviewQualityReport {
  status: LlmReviewRunStatus;
  model: string | null;
  requestedItems: number;
  successfulItems: number;
  finalReviewedItems: number;
  pendingItems: number;
  batchCount: number;
  requestCount: number;
  retryCount: number;
  failedBatchCount: number;
  durationMs: number;
  issues: readonly LlmReviewIssue[];
}

export interface IntelligenceQualityReport {
  llmReview: LlmReviewQualityReport;
}

export interface DailyIntelligenceBrief {
  schemaVersion: 1;
  briefingDate: string;
  timezone: string;
  track: CollectorTrack;
  generatedAt: string;
  candidateCount: number;
  targetCount?: number;
  dailyLimit: number;
  items: readonly IntelligenceSignal[];
  sources: readonly IntelligenceSourceReport[];
  quality?: IntelligenceQualityReport;
}
