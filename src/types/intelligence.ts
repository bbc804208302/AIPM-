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
  title: string;
  source: string;
  category: IntelligenceCategory;
  summary: string;
  impactScore: number | null;
  noveltyScore: number | null;
  productInsight: string | null;
  createdAt: string;
}
