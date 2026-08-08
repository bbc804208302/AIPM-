import type { CollectorCategory, CollectorSourceType, CollectorTrack, SourceTrustTier } from "@/collector/types";

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
  translationStatus?: "reviewed" | "generated";
  url: string;
  publishedAt: string | null;
  collectedAt: string;
  sourceRank: number | null;
  sourceMetadata: Readonly<Record<string, string | number | boolean>>;
  selectionReason: string;
  impactScore: number | null;
  noveltyScore: number | null;
  productInsight: string | null;
  createdAt: string;
  highValue: boolean;
  readStatus: string | null;
  convertedToDemand: boolean;
}

export interface IntelligenceSourceReport {
  sourceId: string;
  sourceName: string;
  status: "success" | "failed";
  collected: number;
  durationMs: number;
  error?: string;
}

export interface DailyIntelligenceBrief {
  schemaVersion: 1;
  briefingDate: string;
  timezone: string;
  track: CollectorTrack;
  generatedAt: string;
  candidateCount: number;
  dailyLimit: number;
  items: readonly IntelligenceSignal[];
  sources: readonly IntelligenceSourceReport[];
}
