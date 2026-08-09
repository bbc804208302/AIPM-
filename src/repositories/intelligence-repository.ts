import type { CollectorTrack } from "@/collector/types";
import type { DailyIntelligenceBrief, IntelligenceSignal } from "@/types/domain";

export type SeenIntelligenceItem = Pick<IntelligenceSignal, "url" | "title">;

export interface IntelligenceRepository {
  getLatestBrief(track: CollectorTrack): Promise<DailyIntelligenceBrief | null>;
  getBrief(track: CollectorTrack, briefingDate: string): Promise<DailyIntelligenceBrief | null>;
  getSeenItems(track: CollectorTrack): Promise<readonly SeenIntelligenceItem[]>;
  saveBrief(brief: DailyIntelligenceBrief): Promise<void>;
  findById(id: string): Promise<IntelligenceSignal | null>;
}

export interface LegacyIntelligenceRepository {
  list(): Promise<readonly IntelligenceSignal[]>;
  findById(id: string): Promise<IntelligenceSignal | null>;
}
